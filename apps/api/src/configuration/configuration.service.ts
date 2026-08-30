import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import axios from 'axios';
import FormData from 'form-data';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from './encryption.service';
import { QueueService } from '../queue/queue.service';
import { OracleService } from '../oracle/oracle.service';
import { formatPhoneNumber } from '@loyalty/shared';

@Injectable()
export class ConfigurationService {
  private readonly logger = new Logger(ConfigurationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly queue: QueueService,
    private readonly oracle: OracleService,
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
    return {
      ...config,
      accessToken: config.accessToken ? '***ENCRYPTED***' : null,
      apiKey: config.apiKey ? this.encryption.decrypt(config.apiKey) : null,
      csrfToken: config.csrfToken ? this.encryption.decrypt(config.csrfToken) : null,
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
      templateOtp?: string;
      isActive?: boolean;
      apiUrl?: string;
      apiKey?: string;
      csrfToken?: string;
      birthdayVarOrder?: string;
      birthdayVarDispatched?: string;
      regVarOrderNo1?: string;
      regVarDispatched1?: string;
    },
    changedBy?: string,
  ) {
    const updateData: Record<string, unknown> = { ...data };
    if (data.accessToken) {
      updateData['accessToken'] = this.encryption.encrypt(data.accessToken);
    }
    if (data.apiKey) {
      updateData['apiKey'] = this.encryption.encrypt(data.apiKey);
    }
    if (data.csrfToken) {
      updateData['csrfToken'] = this.encryption.encrypt(data.csrfToken);
    }
    if (data.apiUrl) {
      updateData['apiUrl'] = data.apiUrl.trim();
    }

    await this.prisma.whatsappConfig.upsert({
      where: { id: 1 },
      update: updateData,
      create: { id: 1, ...updateData },
    });

    await this.auditLog('whatsapp_config', '1', 'UPDATE', changedBy, null, {
      ...updateData,
      accessToken: '[REDACTED]',
      apiKey: '[REDACTED]',
      csrfToken: '[REDACTED]',
    });
    this.logger.log({ changedBy }, 'WhatsApp config updated');
    return { success: true };
  }

  async testWhatsApp(to: string, templateName: string) {
    const phone = formatPhoneNumber(to);

    const config = await this.prisma.whatsappConfig.findFirst({ where: { id: 1 } });
    if (!config?.apiUrl || !config.apiKey || !config.csrfToken) {
      throw new BadRequestException('WhatsApp API URL, X-Api-Key and X-CSRFTOKEN must be configured before sending a test.');
    }

    const apiKey = this.encryption.decrypt(config.apiKey);
    const csrf   = this.encryption.decrypt(config.csrfToken);

    const form = new FormData();
    form.append('customer_name',  'Test User');
    form.append('phone_number',   phone);
    form.append('template_name',  templateName);
    form.append('vars', JSON.stringify({
      order_number:     config.birthdayVarOrder      ?? '',
      dispatched_order: config.birthdayVarDispatched ?? '',
    }));

    try {
      const apiUrl = config.apiUrl.endsWith('/') ? config.apiUrl : `${config.apiUrl}/`;
      await axios.post(apiUrl, form, {
        headers: {
          ...form.getHeaders(),
          accept:        'application/json',
          'X-Api-Key':   apiKey,
          'X-CSRFTOKEN': csrf,
        },
        timeout: 15000,
      });
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? `WhatsApp API error ${err.response?.status}: ${JSON.stringify(err.response?.data)}`
        : String(err);
      throw new BadRequestException(msg);
    }

    this.logger.log({ to: phone, templateName }, 'Test WhatsApp sent directly');
    return { success: true, message: `Test message sent to ${phone}` };
  }

  async sendOtp(to: string, code: string, customerName?: string) {
    const config = await this.prisma.whatsappConfig.findFirst({ where: { id: 1, isActive: true } });
    if (!config?.apiUrl || !config.apiKey || !config.csrfToken) {
      throw new BadRequestException('WhatsApp API URL, X-Api-Key and X-CSRFTOKEN must be configured before sending OTP.');
    }
    if (!config.templateOtp) {
      throw new BadRequestException('OTP WhatsApp template not configured. Set it in Configuration → WhatsApp → OTP Verification Template.');
    }

    const phone = formatPhoneNumber(to);
    const apiKey = this.encryption.decrypt(config.apiKey);
    const csrf   = this.encryption.decrypt(config.csrfToken);

    const form = new FormData();
    form.append('customer_name',  customerName || 'Customer');
    form.append('phone_number',   phone);
    form.append('template_name',  config.templateOtp);
    form.append('vars', JSON.stringify({ body_1: code, url_1: code }));

    try {
      const apiUrl = config.apiUrl.endsWith('/') ? config.apiUrl : `${config.apiUrl}/`;
      await axios.post(apiUrl, form, {
        headers: {
          ...form.getHeaders(),
          accept:        'application/json',
          'X-Api-Key':   apiKey,
          'X-CSRFTOKEN': csrf,
        },
        timeout: 15000,
      });
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? `WhatsApp API error ${err.response?.status}: ${JSON.stringify(err.response?.data)}`
        : String(err);
      throw new BadRequestException(msg);
    }

    this.logger.log({ to: phone, template: config.templateOtp }, 'OTP WhatsApp sent directly');
    return { success: true, sentTo: phone };
  }

  async sendRedemptionOtp(to: string, code: string, customerName?: string) {
    const config = await this.prisma.whatsappConfig.findFirst({ where: { id: 1, isActive: true } });
    if (!config?.apiUrl || !config.apiKey || !config.csrfToken) {
      throw new BadRequestException('WhatsApp API URL, X-Api-Key and X-CSRFTOKEN must be configured before sending OTP.');
    }
    if (!config.templateOtpRedemption) {
      throw new BadRequestException('Redemption OTP WhatsApp template not configured. Set it in Configuration → WhatsApp → Points Redemption OTP Template.');
    }

    const phone = formatPhoneNumber(to);
    const apiKey = this.encryption.decrypt(config.apiKey);
    const csrf   = this.encryption.decrypt(config.csrfToken);

    const form = new FormData();
    form.append('customer_name',  customerName || 'Customer');
    form.append('phone_number',   phone);
    form.append('template_name',  config.templateOtpRedemption);
    form.append('vars', JSON.stringify({ body_1: code, url_1: code }));

    try {
      const apiUrl = config.apiUrl.endsWith('/') ? config.apiUrl : `${config.apiUrl}/`;
      await axios.post(apiUrl, form, {
        headers: {
          ...form.getHeaders(),
          accept:        'application/json',
          'X-Api-Key':   apiKey,
          'X-CSRFTOKEN': csrf,
        },
        timeout: 15000,
      });
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? `WhatsApp API error ${err.response?.status}: ${JSON.stringify(err.response?.data)}`
        : String(err);
      throw new BadRequestException(msg);
    }

    this.logger.log({ to: phone, template: config.templateOtpRedemption }, 'Redemption OTP WhatsApp sent directly');
    return { success: true, sentTo: phone };
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
      emailBody?: string;
      expiryEmailBody?: string;
      expiryWindowValue?: number;
      expiryWindowUnit?: string;
      pointsEarningBase?: string;
      enrollmentDiscountPct?: number;
      enrollmentDiscountActive?: boolean;
      isActive?: boolean;
    },
    changedBy?: string,
  ) {
    const updateData: Record<string, unknown> = {
      ...data,
      ...(data.smtpHost        && { smtpHost:        data.smtpHost.trim() }),
      ...(data.smtpUser        && { smtpUser:        data.smtpUser.trim() }),
      ...(data.fromEmail       && { fromEmail:       data.fromEmail.trim() }),
      ...(data.alertEmail      && { alertEmail:      data.alertEmail.trim() }),
      ...(data.emailBody       !== undefined && { emailBody:       data.emailBody }),
      ...(data.expiryEmailBody !== undefined && { expiryEmailBody: data.expiryEmailBody }),
      ...(data.expiryWindowValue !== undefined && { expiryWindowValue: data.expiryWindowValue }),
      ...(data.expiryWindowUnit  !== undefined && { expiryWindowUnit:  data.expiryWindowUnit }),
      ...(data.pointsEarningBase !== undefined && { pointsEarningBase: data.pointsEarningBase }),
      ...(data.enrollmentDiscountPct    !== undefined && { enrollmentDiscountPct:    data.enrollmentDiscountPct }),
      ...(data.enrollmentDiscountActive !== undefined && { enrollmentDiscountActive: data.enrollmentDiscountActive }),
    };
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

  // ── Points Expiry Manual Trigger (dev/test only) ──────────────────────────

  async triggerExpiryJob(asOf?: string) {
    if (process.env['NODE_ENV'] === 'production') {
      throw new BadRequestException('This endpoint is not available in production.');
    }

    const today = asOf ? new Date(asOf) : new Date();
    today.setHours(23, 59, 59, 999);

    const expiredRows = await this.prisma.pointsExpiry.findMany({
      where: {
        isExpired: false,
        pointsRemaining: { gt: 0 },
        expiryDate: { lte: today },
      },
      include: { customer: true },
    });

    const emailConfig = await this.prisma.emailConfig.findFirst({
      where: { id: 1, isActive: true },
    });

    let processed = 0;
    let emailsQueued = 0;
    const results: Array<{
      customerId: string;
      customerName: string;
      customerEmail: string | null;
      pointsExpired: number;
      expiryDate: string;
    }> = [];

    for (const row of expiredRows) {
      const pointsToExpire = row.pointsRemaining;
      const expiryDateStr = row.expiryDate.toISOString().slice(0, 10);

      try {
        await this.prisma.$transaction(async (tx) => {
          const customer = await tx.customer.findUniqueOrThrow({
            where: { id: row.customerId },
          });

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
              notes: `DEV TRIGGER — Batch earned ${row.earningDate.toISOString().slice(0, 10)}: ${row.pointsAmount} earned, ${row.pointsAmount - pointsToExpire} redeemed, ${pointsToExpire} expired`,
            },
          });

          await tx.pointsExpiry.update({
            where: { id: row.id },
            data: { isExpired: true, pointsRemaining: 0 },
          });
        });

        processed++;

        if (row.customer.email && emailConfig?.smtpHost) {
          const html = this.buildExpiryEmailHtml(
            row.customer.name,
            pointsToExpire,
            expiryDateStr,
            emailConfig.expiryEmailBody ?? null,
          );
          await this.sendEmailDirect(
            row.customer.email,
            `Your ${pointsToExpire} loyalty points have expired`,
            html,
          );
          emailsQueued++;
        }

        results.push({
          customerId: row.customerId,
          customerName: row.customer.name,
          customerEmail: row.customer.email ?? null,
          pointsExpired: pointsToExpire,
          expiryDate: expiryDateStr,
        });
      } catch (err) {
        this.logger.error({ err, rowId: String(row.id) }, 'DEV trigger: failed to expire row');
      }
    }

    this.logger.log({ processed, emailsQueued, asOf: today.toISOString() }, 'DEV expiry trigger completed');
    return { processed, emailsQueued, results };
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
      // Only skip if a successful email was already sent in the last 24 hours.
      // If a previous attempt created a record but failed to send, retry this time.
      const existing = await this.prisma.forensicAlert.findFirst({
        where: {
          mobileNumber: s.mobile_number,
          emailSent: true,
          alertDate: { gte: new Date(Date.now() - 86400000) },
        },
      });

      if (existing) { skipped++; continue; }

      // Create the record first with emailSent:false, update to true only after successful send
      const alert = await this.prisma.forensicAlert.create({
        data: {
          mobileNumber: s.mobile_number,
          transactionCount: s.tx_count,
          firstTransactionDate: s.first_tx_date,
          lastTransactionDate: s.last_tx_date,
          stores: s.stores ?? [],
          totalAmount: s.total_amount,
          emailSent: false,
        },
      });

      const name = s.customer_name ?? 'N/A';
      const mobile = s.mobile_number;

      const customBody = emailConfig.emailBody?.trim();
      const html = customBody
        ? this.buildBodyFromTemplate(customBody, { customer_name: s.customer_name, mobile_number: s.mobile_number })
        : this.buildDefaultForensicHtml(s);

      await this.sendEmailDirect(
        emailConfig.alertEmail,
        `Forensic Alert: Suspicious Activity — ${name} (${mobile})`,
        html,
      );

      // Mark email as successfully sent
      await this.prisma.forensicAlert.update({
        where: { id: alert.id },
        data: { emailSent: true },
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

    const host = config.smtpHost.trim();
    const user = config.smtpUser.trim();
    const fromEmail = config.fromEmail.trim();
    const to = recipientOverride?.trim() || config.alertEmail?.trim() || fromEmail;

    const password = this.encryption.decrypt(config.smtpPass);
    const port = config.smtpPort ?? 587;
    const secure = config.smtpSecure === 'ssl';

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass: password },
      ...(config.smtpSecure === 'tls' ? { requireTLS: true } : {}),
    });

    const bodyText = config.emailBody?.trim() || 'This is a test email from LoyaltyPlus. If you received this, your SMTP credentials are configured correctly.';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
        <div style="background:#16a34a;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0;text-align:center;">
          <h2 style="margin:0;">SMTP Test Email</h2>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
          <p style="white-space:pre-wrap;">${bodyText}</p>
          <p style="color:#6b7280;font-size:12px;margin-top:24px;">Sent at: ${new Date().toLocaleString()}</p>
        </div>
      </div>`;

    try {
      await transporter.sendMail({
        from: `"${(config.fromName ?? 'LoyaltyPlus').trim()}" <${fromEmail}>`,
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

  async verifySmtpConnection() {
    const config = await this.prisma.emailConfig.findFirst({ where: { id: 1 } });

    if (!config?.smtpHost || !config.smtpUser || !config.smtpPass) {
      throw new BadRequestException(
        'SMTP configuration incomplete. Please save Host, Username, and Password first.',
      );
    }

    const host = config.smtpHost.trim();
    const user = config.smtpUser.trim();
    const password = this.encryption.decrypt(config.smtpPass);
    const port = config.smtpPort ?? 587;
    const secure = config.smtpSecure === 'ssl';

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass: password },
      ...(config.smtpSecure === 'tls' ? { requireTLS: true } : {}),
    });

    try {
      await transporter.verify();
      return { success: true, message: 'SMTP connection verified successfully.' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`SMTP connection failed: ${msg}`);
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

  // ── Direct SMTP Send (bypasses Bull queue) ────────────────────────────────

  private async sendEmailDirect(to: string, subject: string, html: string): Promise<void> {
    const config = await this.prisma.emailConfig.findFirst({ where: { id: 1 } });
    if (!config?.smtpHost || !config.smtpUser || !config.smtpPass || !config.fromEmail) {
      this.logger.warn({ to }, 'sendEmailDirect: SMTP not fully configured, skipping');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: config.smtpHost.trim(),
      port: config.smtpPort ?? 587,
      secure: config.smtpSecure === 'ssl',
      auth: { user: config.smtpUser.trim(), pass: this.encryption.decrypt(config.smtpPass) },
      ...(config.smtpSecure === 'tls' ? { requireTLS: true } : {}),
    });

    await transporter.sendMail({
      from: `"${(config.fromName ?? 'LoyaltyPlus').trim()}" <${config.fromEmail.trim()}>`,
      to,
      subject,
      html,
    });

    this.logger.log({ to, subject }, 'Direct SMTP email sent');
  }

  // ── Expiry Email Helper ───────────────────────────────────────────────────

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

  // ── Forensic Email Helpers ────────────────────────────────────────────────

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

  private buildDefaultForensicHtml(s: {
    customer_name: string;
    mobile_number: string;
    tx_count: number;
    first_tx_date: Date;
    last_tx_date: Date;
    stores: string[];
    total_amount: number;
  }): string {
    const name = s.customer_name ?? 'N/A';
    const mobile = s.mobile_number;
    const stores = (s.stores ?? []).join(', ') || 'N/A';
    const firstDate = new Date(s.first_tx_date).toLocaleString();
    const lastDate = new Date(s.last_tx_date).toLocaleString();
    const generatedAt = new Date().toLocaleString();

    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#dc2626;padding:24px 32px;text-align:center;">
          <p style="margin:0;font-size:13px;color:#fecaca;letter-spacing:2px;text-transform:uppercase;">LoyaltyPlus Forensic Monitor</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;">Forensic Alert</h1>
          <p style="margin:6px 0 0;color:#fecaca;font-size:14px;">Suspicious Activity Detected</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#111827;">Dear Admin,</p>
          <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
            Our automated forensic monitoring system has flagged a customer account for <strong>suspicious transaction activity</strong>.
          </p>
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;margin-bottom:24px;">
            <tr style="background:#f9fafb;"><td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;width:45%;">Customer Name</td><td style="padding:10px 14px;border:1px solid #e5e7eb;">${name}</td></tr>
            <tr><td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Mobile Number</td><td style="padding:10px 14px;border:1px solid #e5e7eb;">${mobile}</td></tr>
            <tr style="background:#f9fafb;"><td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;">Transaction Count (3 days)</td><td style="padding:10px 14px;border:1px solid #e5e7eb;color:#dc2626;font-weight:bold;">${s.tx_count}</td></tr>
            <tr><td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Total Amount</td><td style="padding:10px 14px;border:1px solid #e5e7eb;">${s.total_amount.toFixed(2)}</td></tr>
            <tr style="background:#f9fafb;"><td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;">First Transaction</td><td style="padding:10px 14px;border:1px solid #e5e7eb;">${firstDate}</td></tr>
            <tr><td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Last Transaction</td><td style="padding:10px 14px;border:1px solid #e5e7eb;">${lastDate}</td></tr>
            <tr style="background:#f9fafb;"><td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;">Stores Visited</td><td style="padding:10px 14px;border:1px solid #e5e7eb;">${stores}</td></tr>
          </table>
          <p style="margin:0;font-size:14px;color:#374151;">Regards,<br><strong>LoyaltyPlus Forensic Monitor</strong></p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            This is an automated alert generated by LoyaltyPlus Forensic Monitor on ${generatedAt}.<br>Do not reply.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  }

  // ── Oracle — Config ───────────────────────────────────────────────────────────

  async getOracleConfig(): Promise<{
    host: string; port: number; dbUser: string; service: string; subsidiarySid: string | null;
  }> {
    const row = await this.prisma.oracleConfig.findFirst({ where: { id: 1 } });
    if (row) {
      return {
        host:          row.host,
        port:          row.port,
        dbUser:        row.dbUser,
        service:       row.service,
        subsidiarySid: row.subsidiarySid ?? null,
      };
    }
    // Fall back to env vars as defaults
    return {
      host:          process.env['ORACLE_HOST']     ?? '',
      port:          parseInt(process.env['ORACLE_PORT'] ?? '1521', 10),
      dbUser:        process.env['ORACLE_USER']     ?? '',
      service:       process.env['ORACLE_SERVICE']  ?? '',
      subsidiarySid: process.env['RETAILPRO_SUBSIDIARY_SID'] ?? null,
    };
  }

  async saveOracleConfig(data: {
    host: string; port: number; dbUser: string; password?: string; service: string; subsidiarySid?: string;
  }): Promise<{ success: boolean }> {
    const existing = await this.prisma.oracleConfig.findFirst({ where: { id: 1 } });
    const password = data.password
      ? this.encryption.encrypt(data.password)
      : (existing?.password ?? '');

    await this.prisma.oracleConfig.upsert({
      where:  { id: 1 },
      update: { host: data.host, port: data.port, dbUser: data.dbUser, password, service: data.service, subsidiarySid: data.subsidiarySid ?? null },
      create: { id: 1, host: data.host, port: data.port, dbUser: data.dbUser, password, service: data.service, subsidiarySid: data.subsidiarySid ?? null },
    });

    // Reinitialize Oracle pool with new credentials
    const plainPassword = data.password ?? (existing ? this.encryption.decrypt(existing.password) : '');
    if (data.host && data.dbUser && plainPassword && data.service) {
      await this.oracle.reinitialize(data.host, data.port, data.dbUser, plainPassword, data.service);
    }

    this.logger.log({ host: data.host, service: data.service }, 'Oracle config saved and pool reinitialized');
    return { success: true };
  }

  async testOracleConnection(data: {
    host: string; port: number; dbUser: string; password?: string; service: string;
  }): Promise<{ success: boolean; message: string }> {
    let pwd = data.password;
    if (!pwd) {
      const saved = await this.prisma.oracleConfig.findFirst({ where: { id: 1 } });
      if (!saved?.password) {
        return { success: false, message: 'No password provided and none saved. Enter a password to test.' };
      }
      pwd = this.encryption.decrypt(saved.password);
    }
    try {
      const conn = await (await import('oracledb')).getConnection({
        user:          data.dbUser,
        password:      pwd,
        connectString: `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${data.host})(PORT=${data.port}))(CONNECT_DATA=(SID=${data.service})))`,
      });
      await conn.close();
      return { success: true, message: 'Connection successful — Oracle database is reachable.' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, message };
    }
  }

  // ── Oracle — Stores ──────────────────────────────────────────────────────────

  async getStoresFromOracle(): Promise<{ store_no: string; store_name: string }[]> {
    // Prefer subsidiary SID from DB config, fall back to env var
    const dbConfig = await this.prisma.oracleConfig.findFirst({ where: { id: 1 } });
    const subsidiarySid = dbConfig?.subsidiarySid ?? process.env['RETAILPRO_SUBSIDIARY_SID'];

    if (!subsidiarySid) {
      this.logger.warn('Subsidiary SID not configured — cannot fetch stores');
      return [];
    }
    if (!this.oracle.isConnected) {
      this.logger.warn('Oracle pool not available — cannot fetch stores');
      return [];
    }
    try {
      const rows = await this.oracle.getStores(subsidiarySid);
      this.logger.log({ count: rows.length }, 'Stores loaded from Oracle');
      return rows;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error({ message }, 'Failed to fetch stores from Oracle');
      return [];
    }
  }

  getOracleStatus(): { connected: boolean; lastError: string | null; subsidiarySid: string | null } {
    const status = this.oracle.getStatus();
    return {
      ...status,
      subsidiarySid: process.env['RETAILPRO_SUBSIDIARY_SID'] ?? null,
    };
  }

  // ── RetailPro Prism — Stores ────────────────────────────────────────────────

  async getRetailProStores(): Promise<{ sid: string; store_name: string; store_number: string; store_code: string }[]> {
    const baseUrl = process.env['RETAILPRO_BASE_URL'];
    const subsidiarySid = process.env['RETAILPRO_SUBSIDIARY_SID'];

    if (!baseUrl) {
      this.logger.warn('RETAILPRO_BASE_URL not configured — returning empty store list');
      return [];
    }

    const url = `${baseUrl.replace(/\/$/, '')}/v1/rest/store`;
    const params: Record<string, string> = {
      cols: 'sid,store_name,store_number,store_code,active,subsidiary_sid,active_price_level_sid',
      filter: `(active,eq,true)${subsidiarySid ? `AND(subsidiary_sid,eq,${subsidiarySid})` : ''}`,
      sort: 'store_code,asc',
    };

    try {
      const response = await axios.get(url, { params, timeout: 8000 });
      const data = response.data;
      // Prism wraps results in { Records: [...] } or returns an array directly
      const records: Record<string, string>[] = Array.isArray(data) ? data : (data?.Records ?? data?.records ?? []);
      return records.map((r) => ({
        sid:          r['sid']          ?? '',
        store_name:   r['store_name']   ?? '',
        store_number: r['store_number'] ?? '',
        store_code:   r['store_code']   ?? '',
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error({ message }, 'Failed to fetch stores from RetailPro Prism');
      return [];
    }
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
