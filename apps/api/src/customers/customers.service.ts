import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { formatPhoneNumber, getExpiryDate } from '@loyalty/shared';

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
      ...(store && { store: { contains: store, mode: 'insensitive' as const } }),
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

    // Persona computation
    const now = Date.now();
    const lastVisitMs = customer.lastVisitDate ? customer.lastVisitDate.getTime() : 0;
    const daysSinceVisit = lastVisitMs ? Math.floor((now - lastVisitMs) / 86400000) : null;
    const enrolledDaysAgo = Math.floor((now - customer.createdAt.getTime()) / 86400000);
    const redemptionRate = stats.totalPointsEarned > 0
      ? Math.round((stats.totalPointsRedeemed / stats.totalPointsEarned) * 100)
      : 0;

    let personaLabel = 'New';
    if (daysSinceVisit === null || txCount === 0) {
      personaLabel = 'New';
    } else if (daysSinceVisit > 180) {
      personaLabel = stats.totalSpent > 50000 ? 'Cannot Lose' : 'Lost';
    } else if (daysSinceVisit > 90) {
      personaLabel = 'At Risk';
    } else if (enrolledDaysAgo <= 30 && txCount <= 3) {
      personaLabel = 'Promising';
    } else if (daysSinceVisit <= 30 && txCount >= 5 && stats.totalSpent > 20000) {
      personaLabel = 'Champion';
    } else {
      personaLabel = 'Loyal';
    }

    // Preferred store from transactions
    const storeCounts = await this.prisma.transaction.groupBy({
      by: ['store'],
      where: { customerId: id, store: { not: null } },
      _count: { store: true },
      orderBy: { _count: { store: 'desc' } },
      take: 1,
    });
    const preferredStore = storeCounts[0]?.store ?? customer.store ?? null;

    // Next expiry
    const nextExpiry = await this.prisma.pointsExpiry.findFirst({
      where: { customerId: id, isExpired: false, pointsRemaining: { gt: 0 } },
      orderBy: { expiryDate: 'asc' },
      select: { expiryDate: true, pointsRemaining: true },
    });

    // Age + generation from DOB
    let age: number | null = null;
    let generation: string | null = null;
    let birthdayDaysLeft: number | null = null;
    if (customer.dateOfBirth) {
      const dob = customer.dateOfBirth;
      const today = new Date();
      age = today.getFullYear() - dob.getFullYear();
      const hadBirthdayThisYear =
        today.getMonth() > dob.getMonth() ||
        (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
      if (!hadBirthdayThisYear) age -= 1;
      if (age < 28) generation = 'Gen Z';
      else if (age < 44) generation = 'Millennial';
      else if (age < 60) generation = 'Gen X';
      else generation = 'Boomer';
      const nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      if (nextBirthday < today) nextBirthday.setFullYear(today.getFullYear() + 1);
      birthdayDaysLeft = Math.ceil((nextBirthday.getTime() - today.getTime()) / 86400000);
    }

    // Preferred day of week from transactions (all-time)
    const allTxDates = await this.prisma.transaction.findMany({
      where: { customerId: id },
      select: { transactionDate: true },
    });
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    for (const tx of allTxDates) dayCounts[tx.transactionDate.getDay()]++;
    const maxDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const preferredDay = txCount > 0 ? dayNames[maxDayIdx] : null;
    const weekendVisits = dayCounts[0] + dayCounts[6];
    const isWeekendShopper = txCount > 0 && weekendVisits / txCount > 0.6;

    // Redeemer type
    const redeemerType =
      redemptionRate > 60 ? 'Spender' :
      redemptionRate > 20 ? 'Balanced' : 'Saver';

    // Churn risk
    const churnRisk =
      daysSinceVisit === null ? 'Low' :
      daysSinceVisit > 180 ? 'High' :
      daysSinceVisit > 90 ? 'Medium' : 'Low';

    // RFM scores (1–5)
    const recencyScore =
      daysSinceVisit === null ? 1 :
      daysSinceVisit < 30 ? 5 :
      daysSinceVisit < 60 ? 4 :
      daysSinceVisit < 90 ? 3 :
      daysSinceVisit < 180 ? 2 : 1;

    const txCountLastYear = await this.prisma.transaction.count({
      where: { customerId: id, transactionDate: { gte: new Date(Date.now() - 365 * 86400000) } },
    });
    const frequencyScore =
      txCountLastYear > 12 ? 5 :
      txCountLastYear > 8 ? 4 :
      txCountLastYear > 4 ? 3 :
      txCountLastYear > 1 ? 2 : 1;

    const monetaryScore =
      stats.totalSpent > 200000 ? 5 :
      stats.totalSpent > 100000 ? 4 :
      stats.totalSpent > 50000 ? 3 :
      stats.totalSpent > 10000 ? 2 : 1;

    const rfmScores = { recency: recencyScore, frequency: frequencyScore, monetary: monetaryScore };

    // Auto persona tags
    const personaTags: string[] = [];
    if (daysSinceVisit !== null && daysSinceVisit <= 30 && txCount >= 5 && stats.totalSpent > 20000) personaTags.push('Champion');
    if (stats.totalSpent > 100000) personaTags.push('High Value');
    if (isWeekendShopper) personaTags.push('Weekend Shopper');
    if (avgVisitsPerMonth >= 3) personaTags.push('Frequent Buyer');
    if (churnRisk === 'Medium') personaTags.push('At Risk');
    if (churnRisk === 'High') personaTags.push('Lapsed');
    if (redeemerType === 'Spender') personaTags.push('Bargain Hunter');
    if (redeemerType === 'Saver' && stats.totalPointsEarned > 500) personaTags.push('Points Saver');
    if (customer.tier?.name?.toLowerCase().includes('diamond') || customer.tier?.name?.toLowerCase().includes('platinum')) personaTags.push('VIP');
    if (enrolledDaysAgo < 60) personaTags.push('Early Adopter');
    if (birthdayDaysLeft !== null && birthdayDaysLeft <= 14) personaTags.push('Birthday Soon');
    if (personaTags.length === 0) personaTags.push('New Member');

    // ICP goals
    const goals: string[] = [];
    if (redemptionRate > 50) goals.push('Maximize reward redemptions');
    if (avgVisitsPerMonth > 2) goals.push('Regular shopping routine');
    if (stats.totalSpent > 100000) goals.push('Premium / status recognition');
    if (txCount <= 2) goals.push('Explore the loyalty program');
    if (daysSinceVisit !== null && daysSinceVisit < 30 && txCount > 3) goals.push('Get the most value per visit');
    if (goals.length === 0) goals.push('Start building loyalty rewards');

    // ICP pain points
    const painPoints: string[] = [];
    if (redemptionRate < 10 && stats.totalPointsEarned > 500) painPoints.push('Has unused points — may not know how to redeem');
    if (nextExpiry?.pointsRemaining && nextExpiry.expiryDate) {
      const daysToExpiry = Math.floor((nextExpiry.expiryDate.getTime() - Date.now()) / 86400000);
      if (daysToExpiry <= 30) painPoints.push('Points about to expire unused');
    }
    if (daysSinceVisit !== null && daysSinceVisit > 60 && daysSinceVisit < 180) painPoints.push('May have lost interest or found alternatives');
    if (txCount === 1) painPoints.push('Only visited once — not yet converted to loyal');
    if (painPoints.length === 0) painPoints.push('No major friction signals detected');

    // ICP behavior tags
    const behaviors: string[] = [];
    if (avgVisitsPerMonth >= 3) behaviors.push('Frequent Shopper');
    if (redemptionRate > 60) behaviors.push('Active Redeemer');
    if (redemptionRate === 0 && stats.totalPointsEarned > 0) behaviors.push('Points Saver');
    if (stats.avgOrderValue > 10000) behaviors.push('Big Basket Buyer');
    if (preferredStore) behaviors.push('Store-Loyal');
    if (enrolledDaysAgo < 60) behaviors.push('Early Adopter');
    if (behaviors.length === 0) behaviors.push('Getting Started');

    // ICP summary sentence
    const spendStr = `Rs ${Math.round(stats.totalSpent).toLocaleString()}`;
    let summary = '';
    if (personaLabel === 'Champion') {
      summary = `Champion customer${preferredStore ? `, shopping regularly at ${preferredStore}` : ''} with a ${redemptionRate}% redemption rate and ${spendStr} lifetime spend.`;
    } else if (personaLabel === 'Loyal') {
      summary = `Loyal customer with ${txCount} visits and ${spendStr} in lifetime spend${preferredStore ? ` — prefers ${preferredStore}` : ''}.`;
    } else if (personaLabel === 'At Risk') {
      summary = `At-risk customer who last visited ${daysSinceVisit} days ago with ${spendStr} in lifetime spend. Worth re-engaging.`;
    } else if (personaLabel === 'Cannot Lose') {
      summary = `High-value customer (${spendStr} lifetime) who hasn't visited in ${daysSinceVisit} days. Critical to re-engage.`;
    } else if (personaLabel === 'Lost') {
      summary = `Lapsed customer — last seen ${daysSinceVisit} days ago. ${txCount} total visits with ${spendStr} lifetime spend.`;
    } else if (personaLabel === 'Promising') {
      summary = `Promising new customer enrolled ${enrolledDaysAgo} days ago with ${txCount} visit${txCount !== 1 ? 's' : ''} so far.`;
    } else {
      summary = `New customer enrolled ${enrolledDaysAgo} days ago — ${txCount} transaction${txCount !== 1 ? 's' : ''} so far.`;
    }

    const persona = {
      label: personaLabel,
      summary,
      goals,
      painPoints,
      behaviors,
      personaTags,
      daysSinceVisit,
      enrolledDaysAgo,
      redemptionRate,
      preferredStore,
      preferredDay,
      redeemerType,
      churnRisk,
      rfmScores,
      age,
      generation,
      birthdayDaysLeft,
      nextExpiryDate: nextExpiry?.expiryDate ?? null,
      nextExpiryPoints: nextExpiry?.pointsRemaining ?? null,
    };

    return { ...customer, tierProgress, nextTier, stats, persona };
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

  async getTransactionItems(customerId: string, transactionId: string) {
    await this.assertExists(customerId);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = await (this.prisma as any).transactionItem.findMany({
        where: { transactionId },
        orderBy: { id: 'asc' },
      });
      return { data: items ?? [] };
    } catch {
      return { data: [] };
    }
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

  async update(id: string, data: Partial<{ name: string; email: string; dateOfBirth: string; gender: string; region: string; store: string; isActive: boolean; status: string; occupation: string | null; preferredChannel: string | null; maritalStatus: string | null; legalName: string | null; preferredName: string | null; nationality: string | null; city: string | null; area: string | null; homeAddress: string | null; deliveryAddress: string | null; alternatePhone: string | null }>) {
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
    if (!config?.apiUrl) {
      return { success: false, message: 'WhatsApp not configured' };
    }

    const phone = formatPhoneNumber(customer.mobileNumber, customer.countryCode);
    await this.queue.enqueueWhatsApp({
      to: phone,
      templateName,
      customerName: customer.name,
      vars: message ? { message } : {},
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
    const today = new Date();
    const expiryDate = getExpiryDate(today);

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
      // Create an expiry row so manually awarded points expire after 365 days,
      // and are included correctly in FIFO redemption consumption
      this.prisma.pointsExpiry.create({
        data: {
          customerId: id,
          pointsAmount: points,
          pointsRemaining: points,
          earningDate: today,
          expiryDate,
        },
      }),
    ]);

    this.logger.log({ customerId: id, points, reason, awardedBy }, 'Manual points award');
    return { success: true, newBalance };
  }

  async getActivity(customerId: string) {
    await this.assertExists(customerId);
    const since = new Date();
    since.setMonth(since.getMonth() - 11);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const transactions = await this.prisma.transaction.findMany({
      where: { customerId, transactionDate: { gte: since } },
      select: { transactionDate: true, saleAmount: true, pointsEarned: true, pointsRedeemed: true },
      orderBy: { transactionDate: 'asc' },
    });

    const monthMap: Record<string, { month: string; spend: number; earned: number; redeemed: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthMap[key] = { month: label, spend: 0, earned: 0, redeemed: 0 };
    }

    for (const tx of transactions) {
      const key = `${tx.transactionDate.getFullYear()}-${String(tx.transactionDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthMap[key]) {
        monthMap[key].spend += Number(tx.saleAmount);
        monthMap[key].earned += tx.pointsEarned;
        monthMap[key].redeemed += tx.pointsRedeemed;
      }
    }

    // Day of week breakdown (all-time)
    const allTx = await this.prisma.transaction.findMany({
      where: { customerId },
      select: { transactionDate: true },
    });
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayCounts = dayLabels.map((day, i) => {
      const txOnDay = allTx.filter((t) => t.transactionDate.getDay() === i);
      return {
        day,
        visits: txOnDay.length,
        dates: txOnDay
          .map((t) => t.transactionDate.toISOString().slice(0, 10))
          .sort(),
      };
    });

    return { data: Object.values(monthMap), dayOfWeek: dayCounts };
  }

  async getNotes(customerId: string) {
    await this.assertExists(customerId);
    const notes = await this.prisma.customerNote.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
    return { data: notes };
  }

  async addNote(customerId: string, body: string, addedBy: string) {
    await this.assertExists(customerId);
    const note = await this.prisma.customerNote.create({
      data: { customerId, body, addedBy },
    });
    return note;
  }

  async deleteNote(noteId: number) {
    await this.prisma.customerNote.delete({ where: { id: noteId } });
    return { success: true };
  }

  private async assertExists(id: string) {
    const exists = await this.prisma.customer.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException(`Customer ${id} not found`);
  }
}
