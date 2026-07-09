import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { formatPhoneNumber } from '@loyalty/shared';

@Injectable()
export class PointsExpiryJob {
  private readonly logger = new Logger(PointsExpiryJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  /** Run daily at 2 AM */
  @Cron('0 2 * * *', { name: 'points-expiry' })
  async handle() {
    this.logger.log({ job: 'PointsExpiryJob' }, 'Starting points expiry job');
    const start = Date.now();

    try {
      await this.sendExpiryWarnings(7, 'notification_sent_7d', 'template_expiry');
      await this.sendExpiryWarnings(3, 'notification_sent_3d', 'template_expiry');
      await this.sendExpiryWarnings(1, 'notification_sent_1d', 'template_expiry');
      await this.expirePoints();
    } catch (err) {
      this.logger.error({ err, durationMs: Date.now() - start }, 'PointsExpiryJob failed');
    }

    this.logger.log({ job: 'PointsExpiryJob', durationMs: Date.now() - start }, 'Points expiry job complete');
  }

  private async sendExpiryWarnings(
    daysAhead: number,
    sentFlag: 'notification_sent_7d' | 'notification_sent_3d' | 'notification_sent_1d',
    _templateField: string,
  ) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    const dateStr = targetDate.toISOString().slice(0, 10);

    // Only warn about batches that still have points to expire (pointsRemaining > 0)
    const expiringRows = await this.prisma.pointsExpiry.findMany({
      where: {
        isExpired: false,
        [sentFlag]: false,
        pointsRemaining: { gt: 0 },
        expiryDate: new Date(dateStr),
      },
      include: {
        customer: { include: { tier: true } },
      },
    });

    this.logger.log(
      { daysAhead, count: expiringRows.length },
      `Found ${expiringRows.length} expiry warnings for D-${daysAhead}`,
    );

    const config = await this.prisma.whatsappConfig.findFirst({ where: { id: 1, isActive: true } });

    for (const row of expiringRows) {
      try {
        if (config?.apiUrl && config.templateExpiry) {
          const phone = formatPhoneNumber(row.customer.mobileNumber, row.customer.countryCode);
          await this.whatsapp.send({
            to: phone,
            templateName: config.templateExpiry,
            customerName: row.customer.name,
            vars: {
              // Use pointsRemaining so the customer sees the actual amount at risk
              points:      String(row.pointsRemaining),
              days_ahead:  String(daysAhead),
              expiry_date: dateStr,
            },
            customerId: row.customerId,
            notificationType: `expiry_warning_${daysAhead}d`,
          });
        }

        await this.prisma.pointsExpiry.update({
          where: { id: row.id },
          data: { [sentFlag]: true },
        });

        this.logger.log(
          { customerId: row.customerId, pointsRemaining: row.pointsRemaining, daysAhead },
          `Expiry warning D-${daysAhead} sent`,
        );
      } catch (err) {
        this.logger.error({ err, rowId: String(row.id) }, `Failed to send expiry warning D-${daysAhead}`);
      }
    }
  }

  private async expirePoints() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Only process batches with pointsRemaining > 0 — batches fully consumed by
    // redemptions have nothing left to expire
    const expiredRows = await this.prisma.pointsExpiry.findMany({
      where: {
        isExpired: false,
        pointsRemaining: { gt: 0 },
        expiryDate: { lte: today },
      },
      include: { customer: true },
    });

    this.logger.log({ count: expiredRows.length }, 'Processing point expirations');

    for (const row of expiredRows) {
      try {
        await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const customer = await tx.customer.findUniqueOrThrow({ where: { id: row.customerId } });

          // Deduct only pointsRemaining — the portion never consumed by redemptions
          const pointsToExpire = row.pointsRemaining;
          const newBalance = Math.max(0, customer.totalPoints - pointsToExpire);

          await tx.customer.update({
            where: { id: row.customerId },
            data: { totalPoints: newBalance },
          });

          await tx.pointsLedger.create({
            data: {
              customerId: row.customerId,
              pointsChange: -pointsToExpire,
              runningBalance: newBalance,
              reason: 'EXPIRY',
              referenceId: String(row.id),
              notes: `Batch earned ${row.earningDate.toISOString().slice(0, 10)}: ${row.pointsAmount} earned, ${row.pointsAmount - pointsToExpire} redeemed, ${pointsToExpire} expired`,
            },
          });

          await tx.pointsExpiry.update({
            where: { id: row.id },
            data: { isExpired: true, pointsRemaining: 0 },
          });
        });

        this.logger.log(
          {
            customerId: row.customerId,
            pointsExpired: row.pointsRemaining,
            originalAmount: row.pointsAmount,
            alreadyRedeemed: row.pointsAmount - row.pointsRemaining,
          },
          'Points expired',
        );
      } catch (err) {
        this.logger.error({ err, rowId: String(row.id) }, 'Failed to expire points row');
      }
    }
  }
}
