import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface SegmentFilters {
  minSpend?: number;
  maxSpend?: number;
  tierId?: number;
  recency?: string; // '<30' | '30-90' | '90-180' | '180+'
  minVisits?: number;
  maxVisits?: number;
  minPoints?: number;
  maxPoints?: number;
  store?: string;
  region?: string;
  enrolledAfter?: string;
  enrolledBefore?: string;
  isActive?: boolean;
  neverRedeemed?: boolean;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class SegmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomers(filters: SegmentFilters) {
    const {
      minSpend, maxSpend,
      tierId,
      recency,
      minVisits, maxVisits,
      minPoints, maxPoints,
      store, region,
      enrolledAfter, enrolledBefore,
      isActive,
      neverRedeemed,
      page = 1,
      pageSize = 50,
    } = filters;

    const now = new Date();
    const recencyWhere: Prisma.CustomerWhereInput = {};
    if (recency) {
      if (recency === '<30') {
        recencyWhere.lastVisitDate = { gte: new Date(now.getTime() - 30 * 86400000) };
      } else if (recency === '30-90') {
        recencyWhere.lastVisitDate = {
          gte: new Date(now.getTime() - 90 * 86400000),
          lt: new Date(now.getTime() - 30 * 86400000),
        };
      } else if (recency === '90-180') {
        recencyWhere.lastVisitDate = {
          gte: new Date(now.getTime() - 180 * 86400000),
          lt: new Date(now.getTime() - 90 * 86400000),
        };
      } else if (recency === '180+') {
        recencyWhere.lastVisitDate = { lt: new Date(now.getTime() - 180 * 86400000) };
      }
    }

    const where: Prisma.CustomerWhereInput = {
      ...(tierId && { tierId }),
      ...(store && { store }),
      ...(region && { region }),
      ...(isActive !== undefined && { isActive }),
      ...(minSpend !== undefined || maxSpend !== undefined
        ? { lifetimeSale: { ...(minSpend !== undefined && { gte: minSpend }), ...(maxSpend !== undefined && { lte: maxSpend }) } }
        : {}),
      ...(minPoints !== undefined || maxPoints !== undefined
        ? { totalPoints: { ...(minPoints !== undefined && { gte: minPoints }), ...(maxPoints !== undefined && { lte: maxPoints }) } }
        : {}),
      ...(enrolledAfter || enrolledBefore
        ? {
            createdAt: {
              ...(enrolledAfter && { gte: new Date(enrolledAfter) }),
              ...(enrolledBefore && { lte: new Date(enrolledBefore) }),
            },
          }
        : {}),
      ...recencyWhere,
      ...(neverRedeemed && {
        transactions: { none: { pointsRedeemed: { gt: 0 } } },
      }),
    };

    const skip = (page - 1) * pageSize;

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { lifetimeSale: 'desc' },
        select: {
          id: true,
          retailproId: true,
          name: true,
          email: true,
          mobileNumber: true,
          countryCode: true,
          isActive: true,
          segment: true,
          lifetimeSale: true,
          totalPoints: true,
          lastVisitDate: true,
          store: true,
          createdAt: true,
          tier: { select: { name: true } },
          _count: { select: { transactions: true } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    // Filter by visit count after fetching (Prisma doesn't support _count in where directly)
    const filtered =
      minVisits !== undefined || maxVisits !== undefined
        ? customers.filter((c) => {
            const count = c._count.transactions;
            if (minVisits !== undefined && count < minVisits) return false;
            if (maxVisits !== undefined && count > maxVisits) return false;
            return true;
          })
        : customers;

    // Batch fetch total points redeemed per customer (single query for the page)
    const customerIds = filtered.map((c) => c.id);
    const redemptions = customerIds.length
      ? await this.prisma.transaction.groupBy({
          by: ['customerId'],
          where: { customerId: { in: customerIds } },
          _sum: { pointsRedeemed: true },
        })
      : [];
    const redemptionMap: Record<string, number> = Object.fromEntries(
      redemptions.map((r) => [r.customerId, r._sum.pointsRedeemed ?? 0]),
    );

    const nowMs = Date.now();

    const data = filtered.map((c) => ({
      id: c.id,
      retailproId: c.retailproId,
      name: c.name,
      email: c.email,
      mobileNumber: c.mobileNumber,
      countryCode: c.countryCode,
      isActive: c.isActive,
      tier: c.tier?.name ?? null,
      totalPoints: c.totalPoints,
      lastVisitDate: c.lastVisitDate,
      lifetimeSale: c.lifetimeSale,
      transactionCount: c._count.transactions,
      store: c.store,
      createdAt: c.createdAt,
      // ── New strategic columns ──────────────────────────────────────────────
      segment: c.segment ?? 'new',
      avgTransactionValue:
        c._count.transactions > 0
          ? Number(c.lifetimeSale) / c._count.transactions
          : 0,
      totalPointsRedeemed: redemptionMap[c.id] ?? 0,
      tenureDays: Math.floor((nowMs - new Date(c.createdAt).getTime()) / 86400000),
    }));

    return { data, total, page, pageSize };
  }
}
