import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { formatPhoneNumber } from '@loyalty/shared';

@Injectable()
export class BirthdayJob {
  private readonly logger = new Logger(BirthdayJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  /** Run daily at 6 AM */
  @Cron('0 6 * * *', { name: 'birthday-discount' })
  async handle() {
    this.logger.log({ job: 'BirthdayJob' }, 'Starting birthday job');
    const start = Date.now();

    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    try {
      // Load WhatsApp config for birthday template and vars
      const waConfig = await this.prisma.whatsappConfig.findFirst({ where: { id: 1, isActive: true } });

      if (!waConfig?.apiUrl || !waConfig.apiKey) {
        this.logger.warn('WhatsApp not configured or disabled — birthday job skipped');
        return;
      }

      const templateName = waConfig.templateBirthday ?? 'birth_message_logo_opia';
      const orderNumber = waConfig.birthdayVarsOrder ?? '';
      const dispatchedOrder = waConfig.birthdayVarsWish ?? '';
      const vars = JSON.stringify({ order_number: orderNumber, dispatched_order: dispatchedOrder });

      const customers = await this.prisma.$queryRaw<
        Array<{ id: string; name: string; mobile_number: string; country_code: string }>
      >`
        SELECT id::text, name, mobile_number, country_code
        FROM customers
        WHERE is_active = true
          AND EXTRACT(MONTH FROM date_of_birth) = ${month}
          AND EXTRACT(DAY FROM date_of_birth) = ${day}
      `;

      this.logger.log({ count: customers.length, month, day }, 'Birthday customers found');

      for (const customer of customers) {
        try {
          const phone = formatPhoneNumber(customer.mobile_number, customer.country_code);

          await this.whatsapp.send({
            to: phone,
            customerName: customer.name,
            templateName,
            vars,
            components: [],
            customerId: customer.id,
            notificationType: 'birthday',
          });

          this.logger.log({ customerId: customer.id, phone }, 'Birthday WhatsApp sent');
        } catch (err) {
          this.logger.error({ err, customerId: customer.id }, 'Failed to send birthday WhatsApp');
        }
      }
    } catch (err) {
      this.logger.error({ err, durationMs: Date.now() - start }, 'BirthdayJob failed');
    }

    this.logger.log({ job: 'BirthdayJob', durationMs: Date.now() - start }, 'Birthday job complete');
  }
}
