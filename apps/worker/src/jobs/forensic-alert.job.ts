import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../services/email.service';

interface FraudRule {
  id: string;
  label: string;
  windowInterval: string;
  threshold: number;
  dedupHours: number;
}

interface SuspectRow {
  customer_name: string;
  mobile_number: string;
  tx_count: number;
  first_tx_date: Date;
  last_tx_date: Date;
  stores: string[];
  total_amount: number;
}

@Injectable()
export class ForensicAlertJob {
  private readonly logger = new Logger(ForensicAlertJob.name);

  private readonly RULES: FraudRule[] = [
    {
      id: 'tx-24h',
      label: '5 or more transactions within 24 hours',
      windowInterval: '1 day',
      threshold: 5,
      dedupHours: 24,
    },
    {
      id: 'tx-3d',
      label: '5 or more transactions within 3 days',
      windowInterval: '3 days',
      threshold: 5,
      dedupHours: 24,
    },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /** Run every minute */
  @Cron('* * * * *', { name: 'forensic-alert' })
  async handle() {
    const start = Date.now();
    this.logger.log({ job: 'ForensicAlertJob', rules: this.RULES.length }, 'Starting forensic alert job');

    const emailConfig = await this.prisma.emailConfig.findFirst({ where: { id: 1 } });

    for (const rule of this.RULES) {
      try {
        const suspects = await this.runRuleQuery(rule);
        this.logger.log({ rule: rule.id, suspects: suspects.length }, 'Rule evaluated');

        for (const suspect of suspects) {
          await this.processSuspect(suspect, rule, emailConfig);
        }
      } catch (err) {
        this.logger.error({ rule: rule.id, err }, 'Rule evaluation failed');
      }
    }

    this.logger.log({ job: 'ForensicAlertJob', durationMs: Date.now() - start }, 'Forensic alert job complete');
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async runRuleQuery(rule: FraudRule): Promise<SuspectRow[]> {
    return this.prisma.$queryRaw<SuspectRow[]>`
      SELECT
        c.name                                                         AS customer_name,
        c.country_code || c.mobile_number                              AS mobile_number,
        COUNT(t.id)::int                                               AS tx_count,
        MIN(t.transaction_date)                                        AS first_tx_date,
        MAX(t.transaction_date)                                        AS last_tx_date,
        ARRAY_AGG(DISTINCT t.store) FILTER (WHERE t.store IS NOT NULL) AS stores,
        SUM(t.sale_amount)::float                                      AS total_amount
      FROM transactions t
      JOIN customers c ON c.id = t.customer_id
      WHERE t.transaction_date >= NOW() - ${rule.windowInterval}::interval
      GROUP BY c.country_code, c.mobile_number, c.name
      HAVING COUNT(t.id) >= ${rule.threshold}
    `;
  }

  private async processSuspect(
    suspect: SuspectRow,
    rule: FraudRule,
    emailConfig: Record<string, unknown> | null,
  ) {
    try {
      const dedupCutoff = new Date(Date.now() - rule.dedupHours * 3600000);

      const existing = await this.prisma.forensicAlert.findFirst({
        where: {
          mobileNumber: suspect.mobile_number,
          rule: rule.id,
          alertDate: { gte: dedupCutoff },
        },
      });

      if (existing) {
        this.logger.debug(
          { mobile: suspect.mobile_number, rule: rule.id },
          'Forensic suspect already alerted within dedup window — skipping',
        );
        return;
      }

      this.logger.warn(
        {
          rule: rule.id,
          mobile: suspect.mobile_number,
          customerName: suspect.customer_name,
          txCount: suspect.tx_count,
          totalAmount: suspect.total_amount,
          reason: rule.label,
        },
        'Forensic suspect detected',
      );

      const alert = await this.prisma.forensicAlert.create({
        data: {
          mobileNumber: suspect.mobile_number,
          rule: rule.id,
          transactionCount: suspect.tx_count,
          firstTransactionDate: suspect.first_tx_date,
          lastTransactionDate: suspect.last_tx_date,
          stores: suspect.stores ?? [],
          totalAmount: suspect.total_amount,
        },
      });

      const alertEmail = emailConfig?.alertEmail as string | null | undefined;
      const isActive = emailConfig?.isActive as boolean | null | undefined;
      const emailBody = emailConfig?.emailBody as string | null | undefined;

      if (alertEmail && isActive) {
        const html = emailBody?.trim()
          ? this.buildBodyFromTemplate(emailBody.trim(), suspect, rule)
          : this.buildAlertEmailHtml(suspect, rule);

        await this.email.sendAlertEmail(
          alertEmail,
          `Forensic Alert: ${rule.label} — ${suspect.customer_name ?? suspect.mobile_number}`,
          html,
        );

        await this.prisma.forensicAlert.update({
          where: { id: alert.id },
          data: { emailSent: true },
        });

        this.logger.log(
          {
            rule: rule.id,
            mobile: suspect.mobile_number,
            txCount: suspect.tx_count,
            alertId: String(alert.id),
          },
          'Forensic alert email sent',
        );
      } else {
        this.logger.warn({ rule: rule.id }, 'Email config inactive or alertEmail not configured — alert logged but email not sent');
      }
    } catch (err) {
      this.logger.error({ err, rule: rule.id, mobile: suspect.mobile_number }, 'Failed to process forensic suspect');
    }
  }

  private buildBodyFromTemplate(
    template: string,
    suspect: SuspectRow,
    rule: FraudRule,
  ): string {
    const body = template
      .replace(/\{customername\}/gi, suspect.customer_name ?? 'N/A')
      .replace(/\{phoneno\}/gi, suspect.mobile_number)
      .replace(/\{date\}/gi, new Date().toLocaleString())
      .replace(/\{reason\}/gi, rule.label);

    return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <p style="white-space:pre-wrap;font-size:14px;color:#374151;line-height:1.7;">${body}</p>
</div>`;
  }

  private buildAlertEmailHtml(suspect: SuspectRow, rule: FraudRule): string {
    const name = suspect.customer_name ?? 'N/A';
    const mobile = suspect.mobile_number;
    const stores = (suspect.stores ?? []).join(', ') || 'N/A';
    const firstDate = new Date(suspect.first_tx_date).toLocaleString();
    const lastDate = new Date(suspect.last_tx_date).toLocaleString();
    const generatedAt = new Date().toLocaleString();

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <tr>
            <td style="background:#dc2626;padding:24px 32px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#fecaca;letter-spacing:2px;text-transform:uppercase;">LoyaltyPlus Forensic Monitor</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;">Forensic Alert</h1>
              <p style="margin:6px 0 0;color:#fecaca;font-size:14px;">Suspicious Activity Detected</p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;color:#111827;">Dear Admin,</p>

              <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
                Our automated forensic monitoring system has flagged a customer account for
                <strong>suspicious transaction activity</strong>.
                Please review the details below and take appropriate action immediately.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:4px;margin-bottom:24px;">
                <tr>
                  <td style="padding:14px 16px;font-size:14px;color:#7f1d1d;line-height:1.7;">
                    <strong>Rule triggered:</strong> ${rule.label}<br>
                    Customer <strong>${name}</strong> (Mobile: <strong>${mobile}</strong>) has recorded
                    <strong>${suspect.tx_count} transactions</strong>, which exceeds the allowed threshold.
                  </td>
                </tr>
              </table>

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
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#374151;font-weight:600;">Rule Triggered</td>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#dc2626;font-weight:bold;">${rule.label}</td>
                </tr>
                <tr>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#374151;font-weight:600;background:#f9fafb;">Transaction Count</td>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#dc2626;font-weight:bold;">${suspect.tx_count}</td>
                </tr>
                <tr style="background:#f9fafb;">
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#374151;font-weight:600;">Total Amount</td>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#111827;">${suspect.total_amount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#374151;font-weight:600;background:#f9fafb;">First Transaction</td>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#111827;">${firstDate}</td>
                </tr>
                <tr style="background:#f9fafb;">
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#374151;font-weight:600;">Last Transaction</td>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#111827;">${lastDate}</td>
                </tr>
                <tr>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#374151;font-weight:600;background:#f9fafb;">Stores Visited</td>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#111827;">${stores}</td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:#92400e;">Recommended Action</p>
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

          <tr>
            <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">
                Automated alert generated by LoyaltyPlus Forensic Monitor on ${generatedAt}.<br>
                Do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
