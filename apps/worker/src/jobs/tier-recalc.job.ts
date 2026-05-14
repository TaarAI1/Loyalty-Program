import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LoyaltyTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { formatPhoneNumber } from '@loyalty/shared';

@Injectable()
export class TierRecalcJob {
  private readonly logger = new Logger(TierRecalcJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  /** Run daily at 3 AM */
  @Cron('0 3 * * *', { name: 'tier-recalc' })
  async handle() {
    this.logger.log({ job: 'TierRecalcJob' }, 'Starting tier recalculation job');
    const start = Date.now();
    let upgraded = 0;
    let processed = 0;

    try {
      const tiers = await this.prisma.loyaltyTier.findMany({ orderBy: { spendFrom: 'asc' } });
      const customers = await this.prisma.customer.findMany({
        where: { isActive: true },
        select: { id: true, name: true, mobileNumber: true, countryCode: true, tierId: true, lifetimeSale: true },
      });

      const config = await this.prisma.whatsappConfig.findFirst({ where: { id: 1, isActive: true } });

      for (const customer of customers) {
        processed++;
        const lifetimeSale = Number(customer.lifetimeSale);

        // Find the correct tier for this lifetime sale
        const correctTier = tiers
          .slice()
          .reverse()
          .find(
            (t: LoyaltyTier) =>
              lifetimeSale >= Number(t.spendFrom) &&
              (t.spendTo === null || lifetimeSale <= Number(t.spendTo)),
          );

        if (!correctTier || correctTier.id === customer.tierId) continue;

        const oldTier = tiers.find((t: LoyaltyTier) => t.id === customer.tierId);
        const isUpgrade =
          Number(correctTier.spendFrom) > Number(oldTier?.spendFrom ?? 0);

        await this.prisma.customer.update({
          where: { id: customer.id },
          data: { tierId: correctTier.id },
        });

        this.logger.log(
          {
            customerId: customer.id,
            fromTier: oldTier?.name,
            toTier: correctTier.name,
            lifetimeSale,
          },
          'Customer tier updated',
        );

        if (isUpgrade) {
          upgraded++;
          if (config?.accessToken && config.templateTierUpgrade) {
            try {
              const phone = formatPhoneNumber(customer.mobileNumber, customer.countryCode);
              await this.whatsapp.send({
                to: phone,
                templateName: config.templateTierUpgrade,
                components: [
                  {
                    type: 'body',
                    parameters: [
                      { type: 'text', text: customer.name },
                      { type: 'text', text: correctTier.name },
                    ],
                  },
                ],
                customerId: customer.id,
                notificationType: 'tier_upgrade',
              });
            } catch (err) {
              this.logger.error({ err, customerId: customer.id }, 'Failed to send tier upgrade notification');
            }
          }
        }
      }
    } catch (err) {
      this.logger.error({ err, durationMs: Date.now() - start }, 'TierRecalcJob failed');
    }

    this.logger.log(
      { job: 'TierRecalcJob', processed, upgraded, durationMs: Date.now() - start },
      'Tier recalculation complete',
    );
  }
}
