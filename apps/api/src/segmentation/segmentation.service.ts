import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  computeCustomerSegment,
  DEFAULT_SEGMENT_CONFIG,
  SegmentExplain,
  type SegmentConfig,
} from '@loyalty/shared';
import { PrismaService } from '../prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class SegmentationService {
  private readonly logger = new Logger(SegmentationService.name);
  private benchmarkCache: { spendP95: number; at: number } | null = null;
  private readonly benchmarkTtlMs = 5 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  getConfig(): SegmentConfig {
    return DEFAULT_SEGMENT_CONFIG;
  }

  async getSpendP95(db: DbClient = this.prisma): Promise<number | undefined> {
    const now = Date.now();
    if (this.benchmarkCache && now - this.benchmarkCache.at < this.benchmarkTtlMs) {
      return this.benchmarkCache.spendP95;
    }
    const rows = await db.$queryRaw<Array<{ spend_p95: number | null }>>`
      SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY lifetime_sale)::float AS spend_p95
      FROM customers
      WHERE lifetime_sale > 0
    `;
    const spendP95 = rows[0]?.spend_p95 ?? undefined;
    if (spendP95 != null && Number.isFinite(spendP95)) {
      this.benchmarkCache = { spendP95, at: now };
    }
    return spendP95;
  }

  async explainForCustomer(customerId: string): Promise<SegmentExplain & { customerId: string }> {
    const metrics = await this.loadMetrics(customerId);
    const spendP95 = await this.getSpendP95();
    const explain = computeCustomerSegment(metrics, this.getConfig(), { spendP95 });
    return { customerId, ...explain };
  }

  async updateCustomerSegment(
    customerId: string,
    db: DbClient = this.prisma,
  ): Promise<SegmentExplain> {
    const metrics = await this.loadMetrics(customerId, db);
    const spendP95 = await this.getSpendP95(db);
    const explain = computeCustomerSegment(metrics, this.getConfig(), { spendP95 });
    const engagementScore = Math.min(100, Math.max(0, Math.round(explain.compositeScore * 100)));

    await db.customer.update({
      where: { id: customerId },
      data: {
        segment: explain.segment,
        engagementScore,
      },
    });

    return explain;
  }

  async recalculateAll(): Promise<{ updated: number }> {
    const ids = await this.prisma.customer.findMany({ select: { id: true } });
    let updated = 0;
    for (const { id } of ids) {
      try {
        await this.updateCustomerSegment(id);
        updated++;
      } catch (err) {
        this.logger.warn({ err, customerId: id }, 'Segment recalculation failed for customer');
      }
    }
    this.benchmarkCache = null;
    return { updated };
  }

  private async loadMetrics(customerId: string, db: DbClient = this.prisma) {
    const [customer, txAgg, firstTx] = await Promise.all([
      db.customer.findUnique({
        where: { id: customerId },
        select: {
          lifetimeSale: true,
          lastVisitDate: true,
          tier: { select: { name: true } },
        },
      }),
      db.transaction.aggregate({
        where: { customerId, status: 'completed' },
        _count: { id: true },
      }),
      db.transaction.findFirst({
        where: { customerId, status: 'completed' },
        orderBy: { transactionDate: 'asc' },
        select: { transactionDate: true },
      }),
    ]);

    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    return {
      completedTxCount: txAgg._count.id,
      lifetimeSale: Number(customer.lifetimeSale),
      lastVisitDate: customer.lastVisitDate,
      firstVisitDate: firstTx?.transactionDate ?? customer.lastVisitDate,
      tierName: customer.tier?.name ?? null,
      asOfDate: new Date(),
    };
  }
}
