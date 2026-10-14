import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  computeCustomerSegment,
  DEFAULT_SEGMENT_CONFIG,
  PopulationBenchmarks,
  SegmentExplain,
  type SegmentConfig,
} from '@loyalty/shared';
import { PrismaService } from '../prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class SegmentationService {
  private readonly logger = new Logger(SegmentationService.name);
  private benchmarkCache: { benchmarks: PopulationBenchmarks; at: number } | null = null;
  private readonly benchmarkTtlMs = 5 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  getConfig(): SegmentConfig {
    return DEFAULT_SEGMENT_CONFIG;
  }

  async getPopulationBenchmarks(db: DbClient = this.prisma): Promise<PopulationBenchmarks> {
    const now = Date.now();
    if (this.benchmarkCache && now - this.benchmarkCache.at < this.benchmarkTtlMs) {
      return this.benchmarkCache.benchmarks;
    }

    const [spendRows, visitRows] = await Promise.all([
      db.$queryRaw<
        Array<{ spend_p95: number | null; spend_median: number | null; spend_p75: number | null }>
      >`
        SELECT
          percentile_cont(0.95) WITHIN GROUP (ORDER BY lifetime_sale)::float AS spend_p95,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY lifetime_sale)::float AS spend_median,
          percentile_cont(0.75) WITHIN GROUP (ORDER BY lifetime_sale)::float AS spend_p75
        FROM customers
        WHERE lifetime_sale > 0
      `,
      db.$queryRaw<Array<{ visit_median: number | null; visit_p75: number | null }>>`
        SELECT
          percentile_cont(0.5) WITHIN GROUP (ORDER BY cnt)::float AS visit_median,
          percentile_cont(0.75) WITHIN GROUP (ORDER BY cnt)::float AS visit_p75
        FROM (
          SELECT COUNT(*)::float AS cnt
          FROM transactions
          WHERE status = 'completed'
          GROUP BY customer_id
        ) visit_counts
      `,
    ]);

    const spend = spendRows[0];
    const visits = visitRows[0];
    const benchmarks: PopulationBenchmarks = {
      spendP95: spend?.spend_p95 ?? undefined,
      spendMedian: spend?.spend_median ?? undefined,
      spendP75: spend?.spend_p75 ?? undefined,
      visitMedian: visits?.visit_median ?? undefined,
      visitP75: visits?.visit_p75 ?? undefined,
    };

    this.benchmarkCache = { benchmarks, at: now };
    return benchmarks;
  }

  async explainForCustomer(customerId: string): Promise<SegmentExplain & { customerId: string }> {
    const metrics = await this.loadMetrics(customerId);
    const benchmarks = await this.getPopulationBenchmarks();
    const explain = computeCustomerSegment(metrics, this.getConfig(), benchmarks);
    return { customerId, ...explain };
  }

  async updateCustomerSegment(
    customerId: string,
    db: DbClient = this.prisma,
  ): Promise<SegmentExplain> {
    const metrics = await this.loadMetrics(customerId, db);
    const benchmarks = await this.getPopulationBenchmarks(db);
    const explain = computeCustomerSegment(metrics, this.getConfig(), benchmarks);
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
