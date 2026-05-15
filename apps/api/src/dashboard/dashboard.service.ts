import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalCustomers,
      activeCustomers,
      pointsIssuedResult,
      pointsRedeemedResult,
      activeTiers,
      todayTransactions,
      pointsBalanceResult,
      avgTransactionResult,
    ] = await this.prisma.$transaction([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { isActive: true } }),
      this.prisma.transaction.aggregate({ _sum: { pointsEarned: true } }),
      this.prisma.transaction.aggregate({ _sum: { pointsRedeemed: true } }),
      this.prisma.loyaltyTier.count(),
      this.prisma.transaction.aggregate({
        where: { transactionDate: { gte: today, lt: tomorrow } },
        _count: { id: true },
        _sum: { saleAmount: true },
      }),
      this.prisma.customer.aggregate({ _sum: { totalPoints: true } }),
      this.prisma.transaction.aggregate({ _avg: { saleAmount: true } }),
    ]);

    const totalPointsIssued = pointsIssuedResult._sum.pointsEarned ?? 0;
    const totalPointsRedeemed = pointsRedeemedResult._sum.pointsRedeemed ?? 0;
    const redemptionRate =
      totalPointsIssued > 0 ? Math.round((totalPointsRedeemed / totalPointsIssued) * 10000) / 100 : 0;
    const pointsLiability = pointsBalanceResult._sum.totalPoints ?? 0;

    return {
      totalCustomers,
      activeCustomers,
      totalPointsIssued,
      totalPointsRedeemed,
      redemptionRate,
      activeTiers,
      transactionsToday: todayTransactions._count.id,
      revenueToday: Number(todayTransactions._sum.saleAmount ?? 0),
      pointsLiability,
      avgTransactionValue: Number(avgTransactionResult._avg.saleAmount ?? 0),
    };
  }

  async getCustomerSegments() {
    const rows = await this.prisma.$queryRaw<Array<{ segment: string; count: number }>>`
      SELECT COALESCE(segment, 'new') as segment, COUNT(*)::int as count
      FROM customers
      WHERE is_active = true
      GROUP BY segment
      ORDER BY count DESC
    `;

    const segmentMeta: Record<string, { label: string; color: string }> = {
      champion: { label: 'Champions', color: '#FFD000' },
      loyal: { label: 'Loyal', color: '#22c55e' },
      potential: { label: 'Potential', color: '#3b82f6' },
      new: { label: 'New', color: '#8b5cf6' },
      at_risk: { label: 'At Risk', color: '#f97316' },
      dormant: { label: 'Dormant', color: '#ef4444' },
    };

    const total = rows.reduce((s, r) => s + r.count, 0);
    return rows.map((r) => {
      const seg = r.segment ?? 'new';
      const meta = segmentMeta[seg] ?? { label: seg, color: '#999' };
      return {
        segment: seg,
        label: meta.label,
        color: meta.color,
        count: r.count,
        percentage: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0,
      };
    });
  }

  async getTopCustomers(limit = 10) {
    const customers = await this.prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { lifetimeSale: 'desc' },
      take: limit,
      include: { tier: { select: { name: true } } },
    });
    return customers.map((c) => ({
      ...c,
      lifetimeSale: Number(c.lifetimeSale),
    }));
  }

  async getPointsTrend(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await this.prisma.$queryRaw<
      Array<{ date: Date; points_earned: number; points_redeemed: number; transactions: number }>
    >`
      SELECT 
        DATE(transaction_date) as date,
        SUM(points_earned)::int as points_earned,
        SUM(points_redeemed)::int as points_redeemed,
        COUNT(*)::int as transactions
      FROM transactions
      WHERE transaction_date >= ${startDate}
      GROUP BY DATE(transaction_date)
      ORDER BY date ASC
    `;

    return data.map((d) => ({
      date: d.date.toISOString().slice(0, 10),
      pointsEarned: d.points_earned,
      pointsRedeemed: d.points_redeemed,
      transactions: d.transactions,
    }));
  }

  async getTierDistribution() {
    const tiers = await this.prisma.loyaltyTier.findMany({
      include: { _count: { select: { customers: true } } },
    });
    const totalCustomers = await this.prisma.customer.count({ where: { isActive: true } });

    return tiers.map((t) => ({
      tier: t.name,
      count: t._count.customers,
      percentage:
        totalCustomers > 0 ? Math.round((t._count.customers / totalCustomers) * 10000) / 100 : 0,
    }));
  }

  async getRecentTransactions(limit = 10) {
    return this.prisma.transaction.findMany({
      take: limit,
      orderBy: { transactionDate: 'desc' },
      include: {
        customer: { select: { id: true, name: true, mobileNumber: true, tier: { select: { name: true } } } },
      },
    });
  }
}
