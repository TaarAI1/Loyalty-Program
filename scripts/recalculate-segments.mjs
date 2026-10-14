/**
 * Recalculate customers.segment from transaction + visit data.
 * Usage: node scripts/recalculate-segments.mjs
 * Requires DATABASE_URL (loads apps/api/.env if present).
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../apps/api/.env') });
config({ path: resolve(__dirname, '../apps/api/.env.local') });

const require = createRequire(import.meta.url);

async function loadBenchmarks(prisma) {
  const [spendRows, visitRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        percentile_cont(0.95) WITHIN GROUP (ORDER BY lifetime_sale)::float AS spend_p95,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY lifetime_sale)::float AS spend_median,
        percentile_cont(0.75) WITHIN GROUP (ORDER BY lifetime_sale)::float AS spend_p75
      FROM customers
      WHERE lifetime_sale > 0
    `,
    prisma.$queryRaw`
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
  return {
    spendP95: spend?.spend_p95 ?? undefined,
    spendMedian: spend?.spend_median ?? undefined,
    spendP75: spend?.spend_p75 ?? undefined,
    visitMedian: visits?.visit_median ?? undefined,
    visitP75: visits?.visit_p75 ?? undefined,
  };
}

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const {
    computeCustomerSegment,
    DEFAULT_SEGMENT_CONFIG,
  } = require('@loyalty/shared');

  const prisma = new PrismaClient();
  try {
    const benchmarks = await loadBenchmarks(prisma);

    const customers = await prisma.customer.findMany({ select: { id: true } });
    let updated = 0;
    for (const { id } of customers) {
      const [customer, txAgg, firstTx] = await Promise.all([
        prisma.customer.findUnique({
          where: { id },
          select: { lifetimeSale: true, lastVisitDate: true, tier: { select: { name: true } } },
        }),
        prisma.transaction.aggregate({
          where: { customerId: id, status: 'completed' },
          _count: { id: true },
        }),
        prisma.transaction.findFirst({
          where: { customerId: id, status: 'completed' },
          orderBy: { transactionDate: 'asc' },
          select: { transactionDate: true },
        }),
      ]);
      if (!customer) continue;

      const explain = computeCustomerSegment(
        {
          completedTxCount: txAgg._count.id,
          lifetimeSale: Number(customer.lifetimeSale),
          lastVisitDate: customer.lastVisitDate,
          firstVisitDate: firstTx?.transactionDate ?? customer.lastVisitDate,
          tierName: customer.tier?.name ?? null,
          asOfDate: new Date(),
        },
        DEFAULT_SEGMENT_CONFIG,
        benchmarks,
      );

      await prisma.customer.update({
        where: { id },
        data: {
          segment: explain.segment,
          engagementScore: Math.min(100, Math.max(0, Math.round(explain.compositeScore * 100))),
        },
      });
      updated++;
    }
    console.log(`Recalculated segment for ${updated} customers.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
