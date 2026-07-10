import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { EmailService } from '../services/email.service';
import { formatPhoneNumber } from '@loyalty/shared';

@Injectable()
export class PointsExpiryJob {
  private readonly logger = new Logger(PointsExpiryJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly email: EmailService,
  ) {}

  /** Runs every 5 minutes — expires batches whose expiryDate has passed (set to now + configured window on transaction). */
  @Cron('*/5 * * * *', { name: 'points-expiry' })
  async handle() {
    const start = Date.now();
    this.logger.log({ job: 'PointsExpiryJob' }, 'Starting points expiry job');

    for (const [days, flag] of [
      [7, 'notificationSent7d'],
      [3, 'notificationSent3d'],
      [1, 'notificationSent1d'],
    ] as const) {
      try {
        await this.sendExpiryWarnings(days, flag, 'template_expiry');
      } catch (err) {
        this.logger.error({ err }, `sendExpiryWarnings D-${days} failed`);
      }
    }

    try {
      await this.expirePoints();
    } catch (err) {
      this.logger.error({ err }, 'expirePoints failed');
    }

    this.logger.log({ job: 'PointsExpiryJob', durationMs: Date.now() - start }, 'Points expiry job complete');
  }

  private async sendExpiryWarnings(
    daysAhead: number,
    sentFlag: 'notificationSent7d' | 'notificationSent3d' | 'notificationSent1d',
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

    const waConfig = await this.prisma.whatsappConfig.findFirst({ where: { id: 1, isActive: true } });

    for (const row of expiringRows) {
      try {
        // WhatsApp warning only — email is sent on actual expiry, not during warnings
        if (waConfig?.apiUrl && waConfig.templateExpiry) {
          const phone = formatPhoneNumber(row.customer.mobileNumber, row.customer.countryCode);
          await this.whatsapp.send({
            to: phone,
            templateName: waConfig.templateExpiry,
            customerName: row.customer.name,
            vars: {
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

  /**
   * Build a customer-facing HTML email confirming that their points have expired.
   * If a custom template body is configured it is used with variable substitution;
   * otherwise a rich default layout is rendered.
   */
  private buildExpiryEmailHtml(
    customerName: string,
    points: number,
    expiryDate: string,
    templateBody: string | null,
  ): string {
    if (templateBody?.trim()) {
      const body = templateBody
        .replace(/\{customername\}/gi, customerName)
        .replace(/\{points\}/gi, String(points))
        .replace(/\{expiry_date\}/gi, expiryDate);
      return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <p style="white-space:pre-wrap;font-size:14px;color:#374151;line-height:1.7;">${body}</p>
</div>`;
    }

    const generatedAt = new Date().toLocaleString();
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#d97706;padding:24px 32px;text-align:center;">
          <p style="margin:0;font-size:13px;color:#fef3c7;letter-spacing:2px;text-transform:uppercase;">LoyaltyPlus</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;">Points Expired</h1>
          <p style="margin:6px 0 0;color:#fef3c7;font-size:14px;">Your loyalty points have expired</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#111827;">Dear ${customerName},</p>
          <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
            We want to let you know that <strong>${points} loyalty points</strong> in your account expired on <strong>${expiryDate}</strong>.
          </p>
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;margin-bottom:24px;">
            <tr style="background:#f9fafb;"><td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;width:45%;">Points Expired</td><td style="padding:10px 14px;border:1px solid #e5e7eb;color:#d97706;font-weight:bold;">${points}</td></tr>
            <tr><td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Expiry Date</td><td style="padding:10px 14px;border:1px solid #e5e7eb;">${expiryDate}</td></tr>
          </table>
          <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
            Keep shopping with us to earn new points and enjoy exclusive rewards. We look forward to seeing you again soon!
          </p>
          <p style="margin:0;font-size:14px;color:#374151;">Warm regards,<br><strong>LoyaltyPlus Team</strong></p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            This is an automated notification from LoyaltyPlus sent on ${generatedAt}.<br>Do not reply to this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  }

  private async expirePoints() {
    const today = new Date(); // use current time so same-day short-window expiries are caught

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

    // Fetch email config once for all rows
    const emailConfig = await this.prisma.emailConfig.findFirst({ where: { id: 1, isActive: true } });

    for (const row of expiredRows) {
      const pointsToExpire = row.pointsRemaining;
      const expiryDateStr = row.expiryDate.toISOString().slice(0, 10);

      try {
        await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const customer = await tx.customer.findUniqueOrThrow({ where: { id: row.customerId } });

          // Deduct only pointsRemaining — the portion never consumed by redemptions
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
            pointsExpired: pointsToExpire,
            originalAmount: row.pointsAmount,
            alreadyRedeemed: row.pointsAmount - pointsToExpire,
          },
          'Points expired',
        );

        // Send expiry email directly to the customer who lost points
        if (row.customer.email && emailConfig?.smtpHost) {
          try {
            const html = this.buildExpiryEmailHtml(
              row.customer.name,
              pointsToExpire,
              expiryDateStr,
              emailConfig.expiryEmailBody ?? null,
            );
            await this.email.send({
              to: row.customer.email,
              subject: `Your ${pointsToExpire} loyalty points have expired`,
              html,
              customerId: row.customerId,
              notificationType: 'points_expired',
            });
            this.logger.log(
              { customerId: row.customerId, to: row.customer.email, pointsExpired: pointsToExpire },
              'Points expired email sent to customer',
            );
          } catch (emailErr) {
            this.logger.error({ emailErr, customerId: row.customerId }, 'Failed to send points expired email');
          }
        }
      } catch (err) {
        this.logger.error({ err, rowId: String(row.id) }, 'Failed to expire points row');
      }
    }
  }
}
