import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { formatPhoneNumber } from '@loyalty/shared';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  async findAll(params: {
    channel?: string;
    status?: string;
    customerId?: string;
    page: number;
    pageSize: number;
  }) {
    const { channel, status, customerId, page, pageSize } = params;
    const where = {
      ...(channel && { channel }),
      ...(status && { status }),
      ...(customerId && { customerId }),
    };

    const [total, logs] = await this.prisma.$transaction([
      this.prisma.notificationLog.count({ where }),
      this.prisma.notificationLog.findMany({
        where,
        include: { customer: { select: { id: true, name: true } } },
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: logs,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async resend(id: bigint) {
    const log = await this.prisma.notificationLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException(`Notification log ${id} not found`);

    if (log.channel === 'whatsapp' && log.recipient && log.type) {
      const config = await this.prisma.whatsappConfig.findFirst({ where: { id: 1, isActive: true } });
      if (!config) return { success: false, message: 'WhatsApp not configured' };

      await this.queue.enqueueWhatsApp({
        to: formatPhoneNumber(log.recipient),
        templateName: log.content ?? 'default',
        components: [],
        customerId: log.customerId ?? undefined,
        notificationType: 'resend',
      });
    } else if (log.channel === 'sms' && log.recipient && log.content) {
      await this.queue.enqueueSMS({
        to: formatPhoneNumber(log.recipient),
        message: log.content,
        customerId: log.customerId ?? undefined,
        notificationType: 'resend',
      });
    } else if (log.channel === 'email' && log.recipient && log.content) {
      await this.queue.enqueueEmail({
        to: log.recipient,
        subject: log.type ?? 'Loyalty Notification',
        html: log.content,
        customerId: log.customerId ?? undefined,
        notificationType: 'resend',
      });
    }

    await this.prisma.notificationLog.update({
      where: { id },
      data: { status: 'pending' },
    });

    this.logger.log({ notificationLogId: String(id), channel: log.channel }, 'Notification resend queued');
    return { success: true };
  }

  async getStats() {
    const stats = await this.prisma.$queryRaw<Array<{ channel: string; status: string; count: string }>>`
      SELECT channel, status, COUNT(*)::text as count
      FROM notification_logs
      WHERE sent_at >= NOW() - INTERVAL '7 days'
      GROUP BY channel, status
      ORDER BY channel, status
    `;
    return stats;
  }
}
