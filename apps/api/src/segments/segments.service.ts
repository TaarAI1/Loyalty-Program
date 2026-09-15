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
    };

    const skip = (page - 1) * pageSize;

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { lifetimeSale: 'desc' },
        include: {
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
    }));

    return { data, total, page, pageSize };
  }
}
