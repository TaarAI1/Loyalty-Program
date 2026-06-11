import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from './encryption.service';
import { QueueService } from '../queue/queue.service';
import { formatPhoneNumber } from '@loyalty/shared';

@Injectable()
export class ConfigurationService {
  private readonly logger = new Logger(ConfigurationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly queue: QueueService,
  ) {}

  // ── Loyalty Tiers ──────────────────────────────────────────────────────────

  async getTiers() {
    return this.prisma.loyaltyTier.findMany({ orderBy: { spendFrom: 'asc' } });
  }

  async getTier(id: number) {
    const tier = await this.prisma.loyaltyTier.findUnique({ where: { id } });
    if (!tier) throw new NotFoundException(`Tier ${id} not found`);
    return tier;
  }

  async upsertTier(
    id: number | undefined,
    data: {
      name: string;
      pointsFrom: number;
      pointsTo?: number | null;
      spendFrom: number;
      spendTo?: number | null;
      rewardPercentage: number;
      redeemValue?: number;
      benefits?: Record<string, unknown>;
    },
    changedBy?: string,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaData: any = {
      ...data,
      benefits: data.benefits ?? undefined,
    };

    if (id) {
      const old = await this.getTier(id);
      const updated = await this.prisma.loyaltyTier.update({ where: { id }, data: prismaData });
      await this.auditLog('loyalty_tiers', String(id), 'UPDATE', changedBy, old, updated);
      this.logger.log({ tierId: id, name: data.name }, 'Tier updated');
      return updated;
    }
    const created = await this.prisma.loyaltyTier.create({ data: prismaData });
    await this.auditLog('loyalty_tiers', String(created.id), 'CREATE', changedBy, null, created);
    this.logger.log({ tierId: created.id, name: data.name }, 'Tier created');
    return created;
  }

  async deleteTier(id: number, changedBy?: string) {
    const old = await this.getTier(id);
    await this.prisma.loyaltyTier.delete({ where: { id } });
    await this.auditLog('loyalty_tiers', String(id), 'DELETE', changedBy, old, null);
    this.logger.log({ tierId: id }, 'Tier deleted');
    return { success: true };
  }

  // ── WhatsApp Config ────────────────────────────────────────────────────────

  async getWhatsAppConfig() {
    const config = await this.prisma.whatsappConfig.findFirst({ where: { id: 1 } });
    if (!config) return null;
    // Mask sensitive token
    return {
      ...config,
      accessToken: config.accessToken ? '***ENCRYPTED***' : null,
    };
  }

  async updateWhatsAppConfig(
    data: {
      accessToken?: string;
      phoneNumberId?: string;
      businessAccountId?: string;
      templateExpiry?: string;
      templateBirthday?: string;
      templatePointsEarned?: string;
      templateTierUpgrade?: string;
      isActive?: boolean;
    },
    changedBy?: string,
  ) {
    const updateData: Record<string, unknown> = { ...data };
    if (data.accessToken) {
      updateData['accessToken'] = this.encryption.encrypt(data.accessToken);
    }

    const config = await this.prisma.whatsappConfig.upsert({
      where: { id: 1 },
      update: updateData,
      create: { id: 1, ...updateData },
    });

    await this.auditLog('whatsapp_config', '1', 'UPDATE', changedBy, null, {
      ...updateData,
      accessToken: '[REDACTED]',
    });
    this.logger.log({ changedBy }, 'WhatsApp config updated');
    return { success: true };
  }

  async testWhatsApp(to: string, templateName: string) {
    const phone = formatPhoneNumber(to);
    await this.queue.enqueueWhatsApp({
      to: phone,
      templateName,
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: 'Test message from LoyaltyPlus' }],
        },
      ],
      notificationType: 'test',
    });
    this.logger.log({ to: phone, templateName }, 'Test WhatsApp queued');
    return { success: true, message: `Test message queued to ${phone}` };
  }

  // ── SMS Config ─────────────────────────────────────────────────────────────

  async getSmsConfig() {
    const config = await this.prisma.smsConfig.findFirst({ where: { id: 1 } });
    if (!config) return null;
    return { ...config, authToken: config.authToken ? '***ENCRYPTED***' : null };
  }

  async updateSmsConfig(
    data: { accountSid?: string; authToken?: string; fromNumber?: string; isActive?: boolean },
    changedBy?: string,
  ) {
    const updateData: Record<string, unknown> = { ...data };
    if (data.authToken) {
      updateData['authToken'] = this.encryption.encrypt(data.authToken);
    }
    await this.prisma.smsConfig.upsert({
      where: { id: 1 },
      update: updateData,
      create: { id: 1, ...updateData },
    });
    await this.auditLog('sms_config', '1', 'UPDATE', changedBy, null, { ...updateData, authToken: '[REDACTED]' });
    return { success: true };
  }

  // ── Email Config ───────────────────────────────────────────────────────────

  async getEmailConfig() {
    const config = await this.prisma.emailConfig.findFirst({ where: { id: 1 } });
    if (!config) return null;
    const c = config as Record<string, unknown>;
    return {
      ...c,
      smtpPass: c['smtpPass'] ? '***' : null,
    };
  }

  async updateEmailConfig(
    data: {
      smtpHost?: string;
      smtpPort?: number;
      smtpUser?: string;
      smtpPass?: string;
      smtpSecure?: string;
      fromEmail?: string;
      fromName?: string;
      alertEmail?: string;
      isActive?: boolean;
    },
    changedBy?: string,
  ) {
    const updateData: Record<string, unknown> = { ...data };
    if (data.smtpPass) {
      updateData['smtpPass'] = this.encryption.encrypt(data.smtpPass);
    }
    await this.prisma.emailConfig.upsert({
      where: { id: 1 },
      update: updateData,
      create: { id: 1, provider: 'smtp', ...updateData },
    });
    await this.auditLog('email_config', '1', 'UPDATE', changedBy, null, { ...updateData, smtpPass: '[REDACTED]' });
    return { success: true };
  }

  // ── Forensic Alert Manual Trigger ─────────────────────────────────────────

  async triggerForensicCheck() {
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

    const emailConfig = await this.prisma.emailConfig.findFirst({ where: { id: 1 } });

    if (!emailConfig?.alertEmail || !emailConfig.isActive) {
      return {
        suspects: suspects.length,
        alertsSent: 0,
        reason: 'Email notifications are disabled or alertEmail is not configured',
      };
    }

    let alertsSent = 0;
    let skipped = 0;

    for (const s of suspects) {
      const existing = await this.prisma.forensicAlert.findFirst({
        where: {
          mobileNumber: s.mobile_number,
          alertDate: { gte: new Date(Date.now() - 86400000) },
        },
      });

      if (existing) { skipped++; continue; }

      await this.prisma.forensicAlert.create({
        data: {
          mobileNumber: s.mobile_number,
          transactionCount: s.tx_count,
          firstTransactionDate: s.first_tx_date,
          lastTransactionDate: s.last_tx_date,
          stores: s.stores ?? [],
          totalAmount: s.total_amount,
          emailSent: true,
        },
      });

      const name = s.customer_name ?? 'N/A';
      const mobile = s.mobile_number;
      const stores = (s.stores ?? []).join(', ') || 'N/A';
      const firstDate = new Date(s.first_tx_date).toLocaleString();
      const lastDate = new Date(s.last_tx_date).toLocaleString();
      const generatedAt = new Date().toLocaleString();

      const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#dc2626;padding:24px 32px;text-align:center;">
          <p style="margin:0;font-size:13px;color:#fecaca;letter-spacing:2px;text-transform:uppercase;">LoyaltyPlus Forensic Monitor</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;">🚨 Forensic Alert</h1>
          <p style="margin:6px 0 0;color:#fecaca;font-size:14px;">Suspicious Activity Detected</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#111827;">Dear Admin,</p>
          <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
            Our automated forensic monitoring system has flagged a customer account for <strong>suspicious transaction activity</strong>.
            Please review the details below and take appropriate action immediately.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:4px;margin-bottom:24px;">
            <tr><td style="padding:14px 16px;font-size:14px;color:#7f1d1d;line-height:1.7;">
              Customer <strong>${name}</strong> (Mobile: <strong>${mobile}</strong>) has recorded
              <strong>${s.tx_count} transactions</strong> within the last 3 days, which exceeds the allowed activity threshold.
            </td></tr>
          </table>
          <p style="margin:0 0 10px;font-size:13px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Activity Details</p>
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;margin-bottom:24px;">
            <tr style="background:#f9fafb;"><td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;width:45%;">Customer Name</td><td style="padding:10px 14px;border:1px solid #e5e7eb;">${name}</td></tr>
            <tr><td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Mobile Number</td><td style="padding:10px 14px;border:1px solid #e5e7eb;">${mobile}</td></tr>
            <tr style="background:#f9fafb;"><td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;">Transaction Count (3 days)</td><td style="padding:10px 14px;border:1px solid #e5e7eb;color:#dc2626;font-weight:bold;">${s.tx_count}</td></tr>
            <tr><td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Total Amount</td><td style="padding:10px 14px;border:1px solid #e5e7eb;">${s.total_amount.toFixed(2)}</td></tr>
            <tr style="background:#f9fafb;"><td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;">First Transaction</td><td style="padding:10px 14px;border:1px solid #e5e7eb;">${firstDate}</td></tr>
            <tr><td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Last Transaction</td><td style="padding:10px 14px;border:1px solid #e5e7eb;">${lastDate}</td></tr>
            <tr style="background:#f9fafb;"><td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;">Stores Visited</td><td style="padding:10px 14px;border:1px solid #e5e7eb;">${stores}</td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;margin-bottom:24px;">
            <tr><td style="padding:16px 18px;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:#92400e;">⚠️ Recommended Action</p>
              <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">
                We strongly recommend reviewing this account immediately. Consider <strong>blocking the customer</strong> (${name}) until a full investigation is complete.
                Customer status can be managed directly from the <strong>LoyaltyPlus admin panel</strong> under the Customers section.
              </p>
            </td></tr>
          </table>
          <p style="margin:0;font-size:14px;color:#374151;">Regards,<br><strong>LoyaltyPlus Forensic Monitor</strong></p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            This is an automated alert generated by LoyaltyPlus Forensic Monitor on ${generatedAt}.<br>Do not reply to this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

      await this.queue.enqueueEmail({
        to: emailConfig.alertEmail,
        subject: `Forensic Alert: Suspicious Activity — ${name} (${mobile})`,
        html,
        notificationType: 'alert',
      });

      alertsSent++;
    }

    this.logger.log({ suspects: suspects.length, alertsSent, skipped }, 'Manual forensic check completed');
    return { suspects: suspects.length, alertsSent, skipped };
  }

  // ── SMTP Test Email (direct send, no queue) ───────────────────────────────

  async sendTestEmail(recipientOverride?: string) {
    const config = await this.prisma.emailConfig.findFirst({ where: { id: 1 } });

    if (!config?.smtpHost || !config.smtpUser || !config.smtpPass || !config.fromEmail) {
      throw new BadRequestException(
        'SMTP configuration is incomplete. Please save Host, Username, Password, and From Email first.',
      );
    }

    const to = recipientOverride || config.alertEmail || config.fromEmail;

    const password = this.encryption.decrypt(config.smtpPass);
    const port = config.smtpPort ?? 587;
    const secure = config.smtpSecure === 'ssl';

    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port,
      secure,
      auth: { user: config.smtpUser, pass: password },
      ...(config.smtpSecure === 'tls' ? { requireTLS: true } : {}),
    });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
        <div style="background:#16a34a;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0;text-align:center;">
          <h2 style="margin:0;">SMTP Test Email</h2>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
          <p>This is a test email from <strong>LoyaltyPlus</strong>.</p>
          <p>If you received this, your SMTP credentials are configured correctly.</p>
          <p style="color:#6b7280;font-size:12px;margin-top:24px;">Sent at: ${new Date().toLocaleString()}</p>
        </div>
      </div>`;

    try {
      await transporter.sendMail({
        from: `"${config.fromName ?? 'LoyaltyPlus'}" <${config.fromEmail}>`,
        to,
        subject: 'LoyaltyPlus — SMTP Test Email',
        html,
      });
      this.logger.log({ to }, 'Test email sent directly via SMTP');
      return { success: true, sentTo: to };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error({ to, error: msg }, 'Test email send failed');
      throw new BadRequestException(`SMTP send failed: ${msg}`);
    }
  }

  // ── Email Delivery Logs ────────────────────────────────────────────────────

  async getRecentEmailLogs() {
    const rows = await this.prisma.notificationLog.findMany({
      where: { channel: 'email' },
      orderBy: { sentAt: 'desc' },
      take: 10,
      select: {
        id: true,
        recipient: true,
        content: true,
        status: true,
        errorMessage: true,
        sentAt: true,
      },
    });
    return rows.map((r) => ({ ...r, id: r.id.toString() }));
  }

  // ── Audit Log ──────────────────────────────────────────────────────────────

  private async auditLog(
    entity: string,
    entityId: string,
    action: string,
    changedBy: string | undefined,
    oldValue: unknown,
    newValue: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: {
        entity,
        entityId,
        action,
        changedBy: changedBy ?? 'system',
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
      },
    });
  }
}
