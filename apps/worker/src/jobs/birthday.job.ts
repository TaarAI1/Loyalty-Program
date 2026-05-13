import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../services/sms.service';
import { formatPhoneNumber, generateBirthdayCode } from '@loyalty/shared';

@Injectable()
export class BirthdayJob {
  private readonly logger = new Logger(BirthdayJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
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
          const code = generateBirthdayCode(customer.id, today);
          const phone = formatPhoneNumber(customer.mobile_number, customer.country_code);
          const message = `Happy Birthday ${customer.name}! 🎉 Get 30% flat on all purchases today. Use code: ${code}. Valid today only. T&C apply.`;

          await this.sms.send({
            to: phone,
            message,
            customerId: customer.id,
            notificationType: 'birthday',
          });

          this.logger.log({ customerId: customer.id, phone, code }, 'Birthday SMS sent');
        } catch (err) {
          this.logger.error({ err, customerId: customer.id }, 'Failed to send birthday SMS');
        }
      }
    } catch (err) {
      this.logger.error({ err, durationMs: Date.now() - start }, 'BirthdayJob failed');
    }

    this.logger.log({ job: 'BirthdayJob', durationMs: Date.now() - start }, 'Birthday job complete');
  }
}
