import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { formatPhoneNumber } from '@loyalty/shared';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  async findAll(params: {
    search?: string;
    tierId?: number;
    region?: string;
    store?: string;
    isActive?: boolean;
    page: number;
    pageSize: number;
  }) {
    const { search, tierId, region, store, isActive, page, pageSize } = params;
    const skip = (page - 1) * pageSize;

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { mobileNumber: { contains: search } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(tierId && { tierId }),
      ...(region && { region }),
      ...(store && { store }),
      ...(isActive !== undefined && { isActive }),
    };

    const [total, customers] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        include: { tier: true },
        orderBy: { lifetimeSale: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      data: customers,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { tier: true },
    });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);

    // Calculate tier progress
    const nextTier = await this.prisma.loyaltyTier.findFirst({
      where: { spendFrom: { gt: Number(customer.lifetimeSale) } },
      orderBy: { spendFrom: 'asc' },
    });

    const tierProgress = nextTier
      ? Math.min(
          100,
          Math.round(
            ((Number(customer.lifetimeSale) - Number(customer.tier?.spendFrom ?? 0)) /
              (Number(nextTier.spendFrom) - Number(customer.tier?.spendFrom ?? 0))) *
              100,
          ),
        )
      : 100;

    // Aggregate stats for summary cards
    const [txAgg, redemptionAgg, txCount] = await this.prisma.$transaction([
      this.prisma.transaction.aggregate({
        where: { customerId: id },
        _sum: { saleAmount: true, pointsEarned: true },
        _avg: { saleAmount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { customerId: id },
        _sum: { pointsRedeemed: true },
      }),
      this.prisma.transaction.count({ where: { customerId: id } }),
    ]);

    // Avg visits per month (based on days since first transaction)
    const firstTx = await this.prisma.transaction.findFirst({
      where: { customerId: id },
      orderBy: { transactionDate: 'asc' },
      select: { transactionDate: true },
    });

    let avgVisitsPerMonth = 0;
    if (firstTx && txCount > 0) {
      const monthsActive = Math.max(
        1,
        (Date.now() - firstTx.transactionDate.getTime()) / (1000 * 60 * 60 * 24 * 30),
      );
      avgVisitsPerMonth = Math.round((txCount / monthsActive) * 10) / 10;
    }

    const stats = {
      totalSpent: Number(txAgg._sum.saleAmount ?? 0),
      totalPointsEarned: txAgg._sum.pointsEarned ?? 0,
      totalPointsRedeemed: redemptionAgg._sum.pointsRedeemed ?? 0,
      avgOrderValue: Number(txAgg._avg.saleAmount ?? 0),
      totalTransactions: txCount,
      avgVisitsPerMonth,
    };

    return { ...customer, tierProgress, nextTier, stats };
  }

  async getTransactionHistory(
    customerId: string,
    params: { page: number; pageSize: number },
  ) {
    await this.assertExists(customerId);
    const skip = (params.page - 1) * params.pageSize;

    const [total, transactions] = await this.prisma.$transaction([
      this.prisma.transaction.count({ where: { customerId } }),
      this.prisma.transaction.findMany({
        where: { customerId },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: params.pageSize,
      }),
    ]);

    return {
      data: transactions,
      meta: { total, page: params.page, pageSize: params.pageSize, totalPages: Math.ceil(total / params.pageSize) },
    };
  }

  async getPointsLedger(
    customerId: string,
    params: { page: number; pageSize: number },
  ) {
    await this.assertExists(customerId);
    const skip = (params.page - 1) * params.pageSize;

    const [total, entries] = await this.prisma.$transaction([
      this.prisma.pointsLedger.count({ where: { customerId } }),
      this.prisma.pointsLedger.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: params.pageSize,
      }),
    ]);

    return {
      data: entries,
      meta: { total, page: params.page, pageSize: params.pageSize, totalPages: Math.ceil(total / params.pageSize) },
    };
  }

  async update(id: string, data: Partial<{ name: string; email: string; dateOfBirth: string; gender: string; region: string; store: string; isActive: boolean }>) {
    await this.assertExists(id);
    return this.prisma.customer.update({
      where: { id },
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      },
      include: { tier: true },
    });
  }

  async sendManualWhatsApp(customerId: string, templateName: string, message?: string) {
    const customer = await this.findOne(customerId);
    const config = await this.prisma.whatsappConfig.findFirst({ where: { id: 1, isActive: true } });
    if (!config?.accessToken) {
      return { success: false, message: 'WhatsApp not configured' };
    }

    const phone = formatPhoneNumber(customer.mobileNumber, customer.countryCode);
    await this.queue.enqueueWhatsApp({
      to: phone,
      templateName,
      components: message
        ? [{ type: 'body', parameters: [{ type: 'text', text: message }] }]
        : [],
      customerId,
      notificationType: 'manual',
    });
    this.logger.log({ customerId, phone, templateName }, 'Manual WhatsApp notification queued');
    return { success: true };
  }

  async awardPoints(id: string, points: number, reason: string, awardedBy: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id }, select: { id: true, totalPoints: true, lifetimePoints: true, name: true } });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);

    const newBalance = customer.totalPoints + points;
    const newLifetime = customer.lifetimePoints + points;

    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id },
        data: { totalPoints: newBalance, lifetimePoints: newLifetime },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.prisma.pointsLedger.create as any)({
        data: {
          customerId: id,
          pointsChange: points,
          runningBalance: newBalance,
          reason: 'MANUAL_AWARD',
          referenceId: `MANUAL-${Date.now()}-${awardedBy}`,
          notes: reason,
        },
      }),
    ]);

    this.logger.log({ customerId: id, points, reason, awardedBy }, 'Manual points award');
    return { success: true, newBalance };
  }

  private async assertExists(id: string) {
    const exists = await this.prisma.customer.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException(`Customer ${id} not found`);
  }
}
