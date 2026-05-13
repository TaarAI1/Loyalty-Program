import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppJobPayload } from '@loyalty/shared';

const ALGORITHM = 'aes-256-gcm';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly prisma: PrismaService) {}

  async send(payload: WhatsAppJobPayload): Promise<void> {
    const config = await this.prisma.whatsappConfig.findFirst({ where: { id: 1, isActive: true } });

    if (!config?.accessToken || !config.phoneNumberId) {
      this.logger.warn('WhatsApp not configured or disabled — skipping send');
      await this.logNotification(payload, 'skipped', 'WhatsApp not configured');
      return;
    }

    const token = this.decryptToken(config.accessToken);
    const url = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`;

    const startMs = Date.now();
    try {
      await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: payload.to,
          type: 'template',
          template: {
            name: payload.templateName,
            language: { code: 'en_US' },
            components: payload.components,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      const duration = Date.now() - startMs;
      this.logger.log(
        {
          channel: 'whatsapp',
          to: payload.to,
          template: payload.templateName,
          durationMs: duration,
          status: 'sent',
        },
        'WhatsApp message sent',
      );

      await this.logNotification(payload, 'sent');
    } catch (err) {
      const duration = Date.now() - startMs;
      const errorMsg = axios.isAxiosError(err)
        ? `${err.response?.status}: ${JSON.stringify(err.response?.data)}`
        : String(err);

      this.logger.error(
        {
          channel: 'whatsapp',
          to: payload.to,
          template: payload.templateName,
          durationMs: duration,
          error: errorMsg,
        },
        'WhatsApp send failed',
      );

      await this.logNotification(payload, 'failed', errorMsg);
      throw err; // re-throw for BullMQ retry
    }
  }

  private decryptToken(encryptedToken: string): string {
    try {
      const key = crypto
        .createHash('sha256')
        .update(process.env.ENCRYPTION_KEY ?? 'default-dev-key-32-bytes-padding!!')
        .digest();
      const [ivHex, tagHex, dataHex] = encryptedToken.split(':');
      if (!ivHex || !tagHex || !dataHex) return encryptedToken; // plain text fallback
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const data = Buffer.from(dataHex, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      return decipher.update(data) + decipher.final('utf8');
    } catch {
      return encryptedToken;
    }
  }

  private async logNotification(payload: WhatsAppJobPayload, status: string, errorMessage?: string) {
    await this.prisma.notificationLog.create({
      data: {
        customerId: payload.customerId ?? null,
        type: payload.notificationType ?? 'whatsapp',
        channel: 'whatsapp',
        recipient: payload.to,
        content: payload.templateName,
        status,
        errorMessage: errorMessage ?? null,
      },
    });
  }
}
