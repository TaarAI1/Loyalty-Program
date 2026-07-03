import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import FormData from 'form-data';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppJobPayload } from '@loyalty/shared';

const ALGORITHM = 'aes-256-gcm';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly prisma: PrismaService) {}

  async send(payload: WhatsAppJobPayload): Promise<void> {
    const config = await this.prisma.whatsappConfig.findFirst({ where: { id: 1, isActive: true } });

    if (!config?.apiUrl || !config.apiKey || !config.csrfToken) {
      this.logger.warn('WhatsApp not configured or disabled — skipping send');
      await this.logNotification(payload, 'skipped', 'WhatsApp not configured');
      return;
    }

    const apiKey = this.decrypt(config.apiKey);
    const csrf   = this.decrypt(config.csrfToken);

    const form = new FormData();
    form.append('customer_name',  payload.customerName);
    form.append('phone_number',   payload.to);
    form.append('template_name',  payload.templateName);
    form.append('vars', JSON.stringify(payload.vars ?? {}));
    // Also send each var as an individual field (some templates expect direct params)
    for (const [key, value] of Object.entries(payload.vars ?? {})) {
      form.append(key, value);
    }

    const apiUrl = config.apiUrl.endsWith('/') ? config.apiUrl : `${config.apiUrl}/`;
    const startMs = Date.now();
    try {
      await axios.post(apiUrl, form, {
        headers: {
          ...form.getHeaders(),
          accept:        'application/json',
          'X-Api-Key':   apiKey,
          'X-CSRFTOKEN': csrf,
        },
        timeout: 15000,
      });

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
      throw err;
    }
  }

  private decrypt(encrypted: string): string {
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
