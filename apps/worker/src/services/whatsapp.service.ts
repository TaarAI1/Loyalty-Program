import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import * as FormData from 'form-data';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppJobPayload } from '@loyalty/shared';

const ALGORITHM = 'aes-256-gcm';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly prisma: PrismaService) {}

  async send(payload: WhatsAppJobPayload): Promise<void> {
    const config = await this.prisma.whatsappConfig.findFirst({ where: { id: 1, isActive: true } });

    if (!config?.apiUrl || !config.apiKey) {
      this.logger.warn('WhatsApp not configured or disabled — skipping send');
      await this.logNotification(payload, 'skipped', 'WhatsApp not configured');
      return;
    }

    const apiKey = this.decrypt(config.apiKey);
    const csrfToken = config.csrfToken ? this.decrypt(config.csrfToken) : '';
    const url = config.apiUrl.trim();

    const form = new FormData();
    form.append('customer_name', payload.customerName ?? '');
    form.append('phone_number', payload.to);
    form.append('template_name', payload.templateName);
    if (payload.vars) {
      form.append('vars', payload.vars);
    }

    const startMs = Date.now();
    try {
      await axios.post(url, form, {
        headers: {
          ...form.getHeaders(),
          'accept': 'application/json',
          'X-Api-Key': apiKey,
          ...(csrfToken ? { 'X-CSRFTOKEN': csrfToken } : {}),
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

  private decrypt(encryptedValue: string): string {
    try {
      const key = crypto
        .createHash('sha256')
        .update(process.env.ENCRYPTION_KEY ?? 'default-dev-key-32-bytes-padding!!')
        .digest();
      const [ivHex, tagHex, dataHex] = encryptedValue.split(':');
      if (!ivHex || !tagHex || !dataHex) return encryptedValue;
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const data = Buffer.from(dataHex, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      return decipher.update(data) + decipher.final('utf8');
    } catch {
      return encryptedValue;
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
