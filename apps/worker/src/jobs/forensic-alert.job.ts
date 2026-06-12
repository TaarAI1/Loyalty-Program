import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../services/email.service';

@Injectable()
export class ForensicAlertJob {
  private readonly logger = new Logger(ForensicAlertJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /** Run every hour */
  @Cron('0 * * * *', { name: 'forensic-alert' })
  async handle() {
    this.logger.log({ job: 'ForensicAlertJob' }, 'Starting forensic alert job');
    const start = Date.now();

    try {
      const suspects = await this.prisma.$queryRaw<
        Array<{
          customer_name: string;
          mobile_number: string;
          tx_count: number;
          first_tx_date: Date;
          last_tx_date: Date;
          stores: string[];
          total_amount: number;
        }>
      >`
        SELECT 
          c.name as customer_name,
          c.country_code || c.mobile_number as mobile_number,
          COUNT(t.id)::int as tx_count,
          MIN(t.transaction_date) as first_tx_date,
          MAX(t.transaction_date) as last_tx_date,
          ARRAY_AGG(DISTINCT t.store) FILTER (WHERE t.store IS NOT NULL) as stores,
          SUM(t.sale_amount)::float as total_amount
        FROM transactions t
        JOIN customers c ON c.id = t.customer_id
        WHERE t.transaction_date >= NOW() - INTERVAL '3 days'
        GROUP BY c.country_code, c.mobile_number, c.name
        HAVING COUNT(t.id) >= 5
      `;

      this.logger.log({ count: suspects.length }, 'Forensic suspects found');

      const emailConfig = await this.prisma.emailConfig.findFirst({ where: { id: 1 } });

      for (const suspect of suspects) {
        try {
          // Check if alert already sent in last 24h
          const existingAlert = await this.prisma.forensicAlert.findFirst({
            where: {
              mobileNumber: suspect.mobile_number,
              alertDate: { gte: new Date(Date.now() - 86400000) },
            },
          });

          if (existingAlert) continue;

          const alert = await this.prisma.forensicAlert.create({
            data: {
              mobileNumber: suspect.mobile_number,
              transactionCount: suspect.tx_count,
              firstTransactionDate: suspect.first_tx_date,
              lastTransactionDate: suspect.last_tx_date,
              stores: suspect.stores ?? [],
              totalAmount: suspect.total_amount,
            },
          });

          // Send alert email
          if (emailConfig?.alertEmail && emailConfig.isActive) {
            const customBody = (emailConfig as Record<string, unknown>).emailBody as string | null | undefined;
            const html = customBody?.trim()
              ? this.buildBodyFromTemplate(customBody.trim(), suspect)
              : this.buildAlertEmailHtml(suspect);
            await this.email.sendAlertEmail(
              emailConfig.alertEmail,
              `🚨 Forensic Alert: Suspicious Activity — ${suspect.mobile_number}`,
              html,
            );

            await this.prisma.forensicAlert.update({
              where: { id: alert.id },
              data: { emailSent: true },
            });

            this.logger.log(
              {
                mobile: suspect.mobile_number,
                txCount: suspect.tx_count,
                totalAmount: suspect.total_amount,
                alertId: String(alert.id),
              },
              'Forensic alert email sent',
            );
          }
        } catch (err) {
          this.logger.error({ err, mobile: suspect.mobile_number }, 'Failed to process forensic suspect');
        }
      }
    } catch (err) {
      this.logger.error({ err, durationMs: Date.now() - start }, 'ForensicAlertJob failed');
    }

    this.logger.log({ job: 'ForensicAlertJob', durationMs: Date.now() - start }, 'Forensic alert job complete');
  }

  private buildBodyFromTemplate(
    template: string,
    suspect: { customer_name: string; mobile_number: string },
  ): string {
    const body = template
      .replace(/\{customername\}/gi, suspect.customer_name ?? 'N/A')
      .replace(/\{phoneno\}/gi, suspect.mobile_number)
      .replace(/\{date\}/gi, new Date().toLocaleString());

    return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <p style="white-space:pre-wrap;font-size:14px;color:#374151;line-height:1.7;">${body}</p>
</div>`;
  }

  private buildAlertEmailHtml(suspect: {
    customer_name: string;
    mobile_number: string;
    tx_count: number;
    first_tx_date: Date;
    last_tx_date: Date;
    stores: string[];
    total_amount: number;
  }): string {
    const name = suspect.customer_name ?? 'N/A';
    const mobile = suspect.mobile_number;
    const stores = (suspect.stores ?? []).join(', ') || 'N/A';
    const firstDate = new Date(suspect.first_tx_date).toLocaleString();
    const lastDate = new Date(suspect.last_tx_date).toLocaleString();
    const generatedAt = new Date().toLocaleString();

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header Banner -->
          <tr>
            <td style="background:#dc2626;padding:24px 32px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#fecaca;letter-spacing:2px;text-transform:uppercase;">LoyaltyPlus Forensic Monitor</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;">🚨 Forensic Alert</h1>
              <p style="margin:6px 0 0;color:#fecaca;font-size:14px;">Suspicious Activity Detected</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">

              <p style="margin:0 0 16px;font-size:15px;color:#111827;">Dear Admin,</p>

              <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
                Our automated forensic monitoring system has flagged a customer account for <strong>suspicious transaction activity</strong>.
                Please review the details below and take appropriate action immediately.
              </p>

              <!-- Highlight Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:4px;margin-bottom:24px;">
                <tr>
                  <td style="padding:14px 16px;font-size:14px;color:#7f1d1d;line-height:1.7;">
                    Customer <strong>${name}</strong> (Mobile: <strong>${mobile}</strong>) has recorded
                    <strong>${suspect.tx_count} transactions</strong> within the last 3 days,
                    which exceeds the allowed activity threshold.
                  </td>
                </tr>
              </table>

              <!-- Details Table -->
              <p style="margin:0 0 10px;font-size:13px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Activity Details</p>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;margin-bottom:24px;">
                <tr style="background:#f9fafb;">
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#374151;font-weight:600;width:45%;">Customer Name</td>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#111827;">${name}</td>
                </tr>
                <tr>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#374151;font-weight:600;background:#f9fafb;">Mobile Number</td>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#111827;">${mobile}</td>
                </tr>
                <tr style="background:#f9fafb;">
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#374151;font-weight:600;">Transaction Count (3 days)</td>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#dc2626;font-weight:bold;">${suspect.tx_count}</td>
                </tr>
                <tr>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#374151;font-weight:600;background:#f9fafb;">Total Amount</td>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#111827;">${suspect.total_amount.toFixed(2)}</td>
                </tr>
                <tr style="background:#f9fafb;">
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#374151;font-weight:600;">First Transaction</td>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#111827;">${firstDate}</td>
                </tr>
                <tr>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#374151;font-weight:600;background:#f9fafb;">Last Transaction</td>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#111827;">${lastDate}</td>
                </tr>
                <tr style="background:#f9fafb;">
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#374151;font-weight:600;">Stores Visited</td>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#111827;">${stores}</td>
                </tr>
              </table>

              <!-- Recommended Action -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:#92400e;">⚠️ Recommended Action</p>
                    <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">
                      We strongly recommend reviewing this account immediately. Consider
                      <strong>blocking the customer</strong> (${name}) until a full investigation is complete.
                      Customer status can be managed directly from the <strong>LoyaltyPlus admin panel</strong>
                      under the Customers section.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;color:#374151;">
                Regards,<br>
                <strong>LoyaltyPlus Forensic Monitor</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">
                This is an automated alert generated by LoyaltyPlus Forensic Monitor on ${generatedAt}.<br>
                Do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}
