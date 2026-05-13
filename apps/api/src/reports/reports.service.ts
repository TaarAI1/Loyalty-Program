import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface ReportFilters {
  region?: string;
  store?: string;
  tierId?: number;
  gender?: string;
  ageFrom?: number;
  ageTo?: number;
  dateFrom?: string;
  dateTo?: string;
  month?: number;
  year?: number;
  limit?: number;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * PCG-9: Customer Report Tier Wise
   */
  async customerTierWise(filters: ReportFilters) {
    const {
      region, store, tierId, gender, ageFrom, ageTo,
      dateFrom, dateTo, month, year, page = 1, pageSize = 50,
    } = filters;

    const where: Prisma.TransactionWhereInput = {
      ...(region && { region }),
      ...(store && { store }),
      ...(dateFrom || dateTo || month || year
        ? {
            transactionDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
      customer: {
        ...(tierId && { tierId }),
        ...(gender && { gender }),
        ...(ageFrom || ageTo
          ? {
              dateOfBirth: {
                ...(ageTo && { gte: new Date(new Date().setFullYear(new Date().getFullYear() - ageTo)) }),
                ...(ageFrom && { lte: new Date(new Date().setFullYear(new Date().getFullYear() - ageFrom)) }),
              },
            }
          : {}),
      },
    };

    const raw = await this.prisma.transaction.groupBy({
      by: ['customerId'],
      where,
      _sum: { saleAmount: true, pointsEarned: true, pointsRedeemed: true },
      _count: { id: true },
      _max: { transactionDate: true },
      orderBy: { _sum: { saleAmount: 'desc' } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const customerIds = raw.map((r) => r.customerId);
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: {
        id: true,
        name: true,
        mobileNumber: true,
        store: true,
        tier: { select: { name: true } },
      },
    });

    const customerMap = new Map(customers.map((c) => [c.id, c]));
    const now = new Date();

    const data = raw.map((r) => {
      const customer = customerMap.get(r.customerId);
      const lastVisit = r._max.transactionDate;
      const daysSinceLastVisit = lastVisit
        ? Math.floor((now.getTime() - lastVisit.getTime()) / 86400000)
        : null;

      return {
        store: customer?.store ?? '',
        customerName: customer?.name ?? '',
        customerCell: customer?.mobileNumber ?? '',
        tier: customer?.tier?.name ?? '',
        totalTransactions: r._count.id,
        lastVisitDays: daysSinceLastVisit,
        netSale: Number(r._sum.saleAmount ?? 0),
        totalPoints: r._sum.pointsEarned ?? 0,
        rewardsUsed: r._sum.pointsRedeemed ?? 0,
        availableRewards: (r._sum.pointsEarned ?? 0) - (r._sum.pointsRedeemed ?? 0),
      };
    });

    this.logger.log({ report: 'PCG-9', filters, count: data.length }, 'Report generated');
    return { data, filters };
  }

  /**
   * BRR7: Birthday Response Report
   */
  async birthdayResponse(filters: ReportFilters) {
    const { region, store, month, year, page = 1, pageSize = 50 } = filters;
    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const transactions = await this.prisma.$queryRaw<
      Array<{
        region: string;
        store: string;
        outlet: string;
        date: Date;
        receipt_no: string;
        customer_name: string;
        net_sale: number;
      }>
    >`
      SELECT 
        t.region,
        t.store,
        t.outlet,
        DATE(t.transaction_date) as date,
        t.receipt_no,
        c.name as customer_name,
        t.sale_amount as net_sale
      FROM transactions t
      JOIN customers c ON c.id = t.customer_id
      WHERE 
        t.transaction_date BETWEEN ${startDate} AND ${endDate}
        AND EXTRACT(MONTH FROM t.transaction_date) = EXTRACT(MONTH FROM c.date_of_birth)
        AND EXTRACT(DAY FROM t.transaction_date) = EXTRACT(DAY FROM c.date_of_birth)
        ${region ? Prisma.sql`AND t.region = ${region}` : Prisma.empty}
        ${store ? Prisma.sql`AND t.store = ${store}` : Prisma.empty}
      ORDER BY t.transaction_date DESC
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
    `;

    this.logger.log({ report: 'BRR7', targetMonth, targetYear, count: transactions.length }, 'Report generated');
    return { data: transactions, filters };
  }

  /**
   * TCR18: Top Customer Report
   */
  async topCustomers(filters: ReportFilters) {
    const { region, store, tierId, gender, dateFrom, dateTo, limit = 100 } = filters;

    const where: Prisma.TransactionWhereInput = {
      ...(region && { region }),
      ...(store && { store }),
      ...(dateFrom && { transactionDate: { gte: new Date(dateFrom) } }),
      ...(dateTo && { transactionDate: { lte: new Date(dateTo) } }),
      customer: {
        ...(tierId && { tierId }),
        ...(gender && { gender }),
      },
    };

    const raw = await this.prisma.transaction.groupBy({
      by: ['customerId'],
      where,
      _sum: { saleAmount: true },
      orderBy: { _sum: { saleAmount: 'desc' } },
      take: limit,
    });

    const customerIds = raw.map((r) => r.customerId);
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, mobileNumber: true, tier: { select: { name: true } } },
    });

    const customerMap = new Map(customers.map((c) => [c.id, c]));

    const data = raw.map((r) => ({
      customerName: customerMap.get(r.customerId)?.name ?? '',
      phoneNo: customerMap.get(r.customerId)?.mobileNumber ?? '',
      tier: customerMap.get(r.customerId)?.tier?.name ?? '',
      netSale: Number(r._sum.saleAmount ?? 0),
    }));

    this.logger.log({ report: 'TCR18', limit, count: data.length }, 'Report generated');
    return { data, filters };
  }

  /**
   * LSD6: Loyalty Sales Detail
   */
  async loyaltySalesDetail(filters: ReportFilters) {
    const { region, store, dateFrom, dateTo, page = 1, pageSize = 50 } = filters;

    const startDate = dateFrom ? new Date(dateFrom) : new Date(new Date().setDate(1));
    const endDate = dateTo ? new Date(dateTo) : new Date();

    const data = await this.prisma.$queryRaw<
      Array<{
        region: string;
        store: string;
        outlet: string;
        transactions: number;
        registration: number;
        redemption: number;
        loyalty_sale: number;
        rewards_earned: number;
        loyalty_redemption: number;
      }>
    >`
      SELECT 
        t.region,
        t.store,
        t.outlet,
        COUNT(DISTINCT t.id)::int as transactions,
        COUNT(DISTINCT CASE WHEN t.points_earned > 0 THEN c.id END)::int as registration,
        COUNT(DISTINCT CASE WHEN t.points_redeemed > 0 THEN t.id END)::int as redemption,
        SUM(t.sale_amount)::float as loyalty_sale,
        SUM(t.points_earned)::int as rewards_earned,
        SUM(t.points_redeemed)::int as loyalty_redemption
      FROM transactions t
      JOIN customers c ON c.id = t.customer_id
      WHERE t.transaction_date BETWEEN ${startDate} AND ${endDate}
        ${region ? Prisma.sql`AND t.region = ${region}` : Prisma.empty}
        ${store ? Prisma.sql`AND t.store = ${store}` : Prisma.empty}
      GROUP BY t.region, t.store, t.outlet
      ORDER BY t.region, t.store
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
    `;

    this.logger.log({ report: 'LSD6', dateFrom: startDate, dateTo: endDate, count: data.length }, 'Report generated');
    return { data, filters };
  }

  /**
   * SSFR8: Forensic Report
   */
  async forensicReport(filters: ReportFilters) {
    const { region, store, dateFrom, dateTo, page = 1, pageSize = 50 } = filters;

    const data = await this.prisma.$queryRaw<
      Array<{
        store: string;
        card_no: string;
        name: string;
        total_earning: number;
        redemption: number;
        available_reward: number;
        status: string;
        action_date: Date;
      }>
    >`
      SELECT 
        COALESCE(t.store, '') as store,
        c.id::text as card_no,
        c.name,
        COALESCE(SUM(t.points_earned), 0)::int as total_earning,
        COALESCE(SUM(t.points_redeemed), 0)::int as redemption,
        (COALESCE(SUM(t.points_earned), 0) - COALESCE(SUM(t.points_redeemed), 0))::int as available_reward,
        'BLOCK' as status,
        fa.alert_date as action_date
      FROM forensic_alerts fa
      JOIN customers c 
        ON ('+' || c.country_code || c.mobile_number) = fa.mobile_number
        OR (c.country_code || c.mobile_number) = fa.mobile_number
      LEFT JOIN transactions t ON c.id = t.customer_id
      WHERE 1=1
        ${dateFrom ? Prisma.sql`AND fa.alert_date >= ${new Date(dateFrom)}` : Prisma.empty}
        ${dateTo ? Prisma.sql`AND fa.alert_date <= ${new Date(dateTo)}` : Prisma.empty}
        ${store ? Prisma.sql`AND t.store = ${store}` : Prisma.empty}
        ${region ? Prisma.sql`AND t.region = ${region}` : Prisma.empty}
      GROUP BY t.store, c.id, c.name, fa.alert_date
      ORDER BY fa.alert_date DESC
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
    `;

    this.logger.log({ report: 'SSFR8', count: data.length }, 'Report generated');
    return { data, filters };
  }

  async getFilterOptions() {
    const [regions, stores, tiers] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        select: { region: true },
        distinct: ['region'],
        where: { region: { not: null } },
      }),
      this.prisma.transaction.findMany({
        select: { store: true },
        distinct: ['store'],
        where: { store: { not: null } },
      }),
      this.prisma.loyaltyTier.findMany({ select: { id: true, name: true } }),
    ]);

    return {
      regions: regions.map((r) => r.region).filter(Boolean),
      stores: stores.map((s) => s.store).filter(Boolean),
      tiers,
    };
  }
}
