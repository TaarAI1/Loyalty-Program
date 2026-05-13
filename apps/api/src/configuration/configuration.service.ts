import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
          parameters: [{ type: 'text', text: 'Test message from Loyalty Program' }],
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
    return { ...config, apiKey: config.apiKey ? '***ENCRYPTED***' : null };
  }

  async updateEmailConfig(
    data: { apiKey?: string; fromEmail?: string; fromName?: string; alertEmail?: string; isActive?: boolean },
    changedBy?: string,
  ) {
    const updateData: Record<string, unknown> = { ...data };
    if (data.apiKey) {
      updateData['apiKey'] = this.encryption.encrypt(data.apiKey);
    }
    await this.prisma.emailConfig.upsert({
      where: { id: 1 },
      update: updateData,
      create: { id: 1, ...updateData },
    });
    await this.auditLog('email_config', '1', 'UPDATE', changedBy, null, { ...updateData, apiKey: '[REDACTED]' });
    return { success: true };
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
