import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { EmailJobPayload } from '@loyalty/shared';

const ALGORITHM = 'aes-256-gcm';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly prisma: PrismaService) {}

  async send(payload: EmailJobPayload): Promise<void> {
    const config = await this.prisma.emailConfig.findFirst({ where: { id: 1, isActive: true } });

    if (!config?.smtpHost || !config.smtpUser || !config.smtpPass || !config.fromEmail) {
      this.logger.warn('SMTP not configured or disabled — skipping send');
      await this.logNotification(payload, 'skipped', 'SMTP not configured');
      return;
    }

    const password = this.decryptToken(config.smtpPass);
    const port = config.smtpPort ?? 587;
    const secure = config.smtpSecure === 'ssl';

    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port,
      secure,
      auth: { user: config.smtpUser, pass: password },
      ...(config.smtpSecure === 'tls' ? { requireTLS: true } : {}),
    });

    const startMs = Date.now();

    try {
      await transporter.sendMail({
        from: `"${config.fromName ?? 'LoyalArc'}" <${config.fromEmail}>`,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      });

      const duration = Date.now() - startMs;
      this.logger.log(
        { channel: 'email', to: payload.to, subject: payload.subject, durationMs: duration, status: 'sent' },
        'Email sent via SMTP',
      );

      await this.logNotification(payload, 'sent');
    } catch (err) {
      const duration = Date.now() - startMs;
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        { channel: 'email', to: payload.to, durationMs: duration, error: errorMsg },
        'Email send failed',
      );
      await this.logNotification(payload, 'failed', errorMsg);
      throw err;
    }
  }

  async sendAlertEmail(to: string, subject: string, html: string) {
    return this.send({ to, subject, html, notificationType: 'alert' });
  }

  private decryptToken(encrypted: string): string {
    try {
      const key = crypto
        .createHash('sha256')
        .update(process.env.ENCRYPTION_KEY ?? 'default-dev-key-32-bytes-padding!!')
        .digest();
      const [ivHex, tagHex, dataHex] = encrypted.split(':');
      if (!ivHex || !tagHex || !dataHex) return encrypted;
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const data = Buffer.from(dataHex, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      return decipher.update(data) + decipher.final('utf8');
    } catch {
      return encrypted;
    }
  }

  private async logNotification(payload: EmailJobPayload, status: string, errorMessage?: string) {
    await this.prisma.notificationLog.create({
      data: {
        customerId: payload.customerId ?? null,
        type: payload.notificationType ?? 'email',
        channel: 'email',
        recipient: payload.to,
        content: payload.subject,
        status,
        errorMessage: errorMessage ?? null,
      },
    });
  }
}
