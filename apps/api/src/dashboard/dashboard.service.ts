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
    ]);

    const totalPointsIssued = pointsIssuedResult._sum.pointsEarned ?? 0;
    const totalPointsRedeemed = pointsRedeemedResult._sum.pointsRedeemed ?? 0;
    const redemptionRate =
      totalPointsIssued > 0 ? Math.round((totalPointsRedeemed / totalPointsIssued) * 10000) / 100 : 0;

    return {
      totalCustomers,
      activeCustomers,
      totalPointsIssued,
      totalPointsRedeemed,
      redemptionRate,
      activeTiers,
      transactionsToday: todayTransactions._count.id,
      revenueToday: Number(todayTransactions._sum.saleAmount ?? 0),
    };
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
