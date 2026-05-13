import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SMSJobPayload } from '@loyalty/shared';

const ALGORITHM = 'aes-256-gcm';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async send(payload: SMSJobPayload): Promise<void> {
    const config = await this.prisma.smsConfig.findFirst({ where: { id: 1, isActive: true } });

    if (!config?.accountSid || !config.authToken || !config.fromNumber) {
      this.logger.warn('SMS not configured or disabled — skipping send');
      await this.logNotification(payload, 'skipped', 'SMS not configured');
      return;
    }

    const authToken = this.decryptToken(config.authToken);
    const startMs = Date.now();

    try {
      // Dynamic import to avoid issues when twilio is not installed
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const twilio = require('twilio');
      const client = twilio(config.accountSid, authToken);

      await client.messages.create({
        body: payload.message,
        from: config.fromNumber,
        to: `+${payload.to}`,
      });

      const duration = Date.now() - startMs;
      this.logger.log(
        { channel: 'sms', to: payload.to, durationMs: duration, status: 'sent' },
        'SMS sent',
      );

      await this.logNotification(payload, 'sent');
    } catch (err) {
      const duration = Date.now() - startMs;
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        { channel: 'sms', to: payload.to, durationMs: duration, error: errorMsg },
        'SMS send failed',
      );
      await this.logNotification(payload, 'failed', errorMsg);
      throw err;
    }
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

  private async logNotification(payload: SMSJobPayload, status: string, errorMessage?: string) {
    await this.prisma.notificationLog.create({
      data: {
        customerId: payload.customerId ?? null,
        type: payload.notificationType ?? 'sms',
        channel: 'sms',
        recipient: payload.to,
        content: payload.message,
        status,
        errorMessage: errorMessage ?? null,
      },
    });
  }
}
