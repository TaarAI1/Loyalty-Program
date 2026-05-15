import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { PointsRulesService } from '../configuration/points-rules.service';
import { CampaignsService } from '../configuration/campaigns.service';
import { calculatePoints, getExpiryDate, formatPhoneNumber } from '@loyalty/shared';
import { LoyaltyTier, Customer } from '@prisma/client';

export interface ProcessTransactionResult {
  success: boolean;
  pointsEarned: number;
  newTier: string;
  previousTier: string | null;
  tierUpgraded: boolean;
  customerId: string;
}

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly pointsRules: PointsRulesService,
    private readonly campaigns: CampaignsService,
  ) {}

  /**
   * Process a sale transaction atomically:
   * 1. Find or create customer
   * 2. Determine tier
   * 3. Calculate points
   * 4. Update customer + create transaction + ledger + expiry entries
   * 5. Notify via WhatsApp queue
   */
  async processTransaction(params: {
    retailproTransactionId: string;
    customerMobile: string;
    customerName: string;
    saleAmount: number;
    transactionDate: Date;
    store: string;
    region: string;
    receiptNo?: string;
    outlet?: string;
    countryCode?: string;
  }): Promise<ProcessTransactionResult> {
    const { retailproTransactionId, customerMobile, customerName, saleAmount, countryCode = '92' } = params;

    const result = await this.prisma.$transaction(async (tx) => {
      // Find or create customer
      let customer = await tx.customer.findFirst({
        where: { mobileNumber: customerMobile, countryCode },
        include: { tier: true },
      });

      const isNewCustomer = !customer;

      if (!customer) {
        const tier = await this.getDefaultTier(tx as typeof this.prisma);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        customer = await (tx.customer.create as any)({
          data: {
            name: customerName,
            mobileNumber: customerMobile,
            countryCode,
            tierId: tier.id,
            store: params.store,
            region: params.region,
            segment: 'new',
          },
          include: { tier: true },
        });
        this.logger.log(
          { customerId: customer!.id, mobile: customerMobile },
          'New customer created via webhook',
        );
      }

      // Non-null assertion: customer is guaranteed assigned at this point
      const c = customer!;

      const currentTierName = c.tier?.name ?? null;

      // Determine reward percentage based on current tier (rewardPercentage stored as e.g. 4.00 = 4%)
      const rewardPct = Number(c.tier?.rewardPercentage ?? 0);
      let pointsEarned = rewardPct > 0 ? calculatePoints(saleAmount, rewardPct) : 0;

      // Apply campaign multiplier (active time-limited campaigns)
      const campaignMultiplier = await this.campaigns.getActiveMultiplier(c.tierId);
      if (campaignMultiplier > 1) pointsEarned = Math.round(pointsEarned * campaignMultiplier);

      // Apply welcome bonus for brand-new customers on their first transaction
      if (isNewCustomer) {
        const welcomeBonus = await this.pointsRules.getActiveValue('welcome_bonus');
        if (welcomeBonus) pointsEarned += welcomeBonus;
      }

      // Apply birthday multiplier (if today is customer's birthday month+day)
      if (c.dateOfBirth) {
        const now = params.transactionDate;
        const dob = new Date(c.dateOfBirth);
        if (dob.getMonth() === now.getMonth() && dob.getDate() === now.getDate()) {
          const birthdayMultiplier = await this.pointsRules.getActiveValue('birthday_multiplier');
          if (birthdayMultiplier && birthdayMultiplier > 1)
            pointsEarned = Math.round(pointsEarned * birthdayMultiplier);
        }
      }

      // Apply first-purchase bonus (customer has no prior transactions)
      const txCount = await tx.transaction.count({ where: { customerId: c.id } });
      if (txCount === 0 && !isNewCustomer) {
        const firstPurchaseBonus = await this.pointsRules.getActiveValue('first_purchase_bonus');
        if (firstPurchaseBonus) pointsEarned += firstPurchaseBonus;
      }

      // Calculate new lifetime values
      const newLifetimeSale = Number(c.lifetimeSale) + saleAmount;
      const newLifetimePoints = c.lifetimePoints + pointsEarned;
      const newTotalPoints = c.totalPoints + pointsEarned;

      // Find the correct tier for new lifetime sale
      const newTier = await this.determineTier(tx as typeof this.prisma, newLifetimeSale);

      // Create the transaction record
      const transaction = await tx.transaction.create({
        data: {
          retailproTransactionId,
          customerId: c.id,
          transactionDate: params.transactionDate,
          saleAmount,
          pointsEarned,
          store: params.store,
          region: params.region,
          receiptNo: params.receiptNo,
          outlet: params.outlet,
          status: 'completed',
        },
      });

      // Compute engagement score (simple: 1–100 based on recency + frequency)
      const daysSinceLast = c.lastVisitDate
        ? Math.floor((params.transactionDate.getTime() - c.lastVisitDate.getTime()) / 86400000)
        : 999;
      const recencyScore = Math.max(0, 100 - daysSinceLast);
      const newEngagementScore = Math.min(100, Math.round(recencyScore * 0.7 + Math.min(txCount + 1, 30) * 1));

      // Determine segment
      const segment = this.computeSegment(txCount + 1, daysSinceLast, newLifetimeSale);

      // Update customer (use any cast for new fields until Prisma regenerates)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (tx.customer.update as any)({
        where: { id: c.id },
        data: {
          lifetimeSale: newLifetimeSale,
          lifetimePoints: newLifetimePoints,
          totalPoints: newTotalPoints,
          tierId: newTier.id,
          lastVisitDate: params.transactionDate,
          name: customerName,
          engagementScore: newEngagementScore,
          segment,
        },
      });

      // Points ledger entry
      await tx.pointsLedger.create({
        data: {
          customerId: c.id,
          transactionId: transaction.id,
          pointsChange: pointsEarned,
          runningBalance: newTotalPoints,
          reason: 'EARNED',
          referenceId: retailproTransactionId,
        },
      });

      // Points expiry entry (365 days rolling)
      const today = new Date();
      const expiryDate = getExpiryDate(today);
      await tx.pointsExpiry.create({
        data: {
          customerId: c.id,
          pointsAmount: pointsEarned,
          earningDate: today,
          expiryDate,
        },
      });

      this.logger.log(
        {
          customerId: c.id,
          transactionId: transaction.id,
          pointsEarned,
          runningBalance: newTotalPoints,
          saleAmount,
          tierFrom: currentTierName,
          tierTo: newTier.name,
        },
        'Points earned',
      );

      return {
        customer: c,
        transaction,
        pointsEarned,
        newTier,
        previousTierName: currentTierName,
        newTotalPoints,
      };
    });

    const tierUpgraded = result.newTier.name !== result.previousTierName;

    // Enqueue WhatsApp points-earned notification
    await this.enqueuePointsEarnedNotification(result.customer, result.pointsEarned, result.newTotalPoints, result.newTier.name);

    // Enqueue tier-upgrade notification if applicable
    if (tierUpgraded && result.previousTierName !== null) {
      await this.enqueueTierUpgradeNotification(result.customer, result.newTier.name);
    }

    return {
      success: true,
      pointsEarned: result.pointsEarned,
      newTier: result.newTier.name,
      previousTier: result.previousTierName,
      tierUpgraded,
      customerId: result.customer.id,
    };
  }

  async redeemPoints(params: {
    customerId: string;
    pointsToRedeem: number;
    transactionId: string;
    store: string;
    region: string;
  }): Promise<{ success: boolean; newBalance: number }> {
    const result = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUniqueOrThrow({ where: { id: params.customerId } });

      if (customer.totalPoints < params.pointsToRedeem) {
        throw new BadRequestException(
          `Insufficient points: available ${customer.totalPoints}, requested ${params.pointsToRedeem}`,
        );
      }

      const newBalance = customer.totalPoints - params.pointsToRedeem;

      await tx.customer.update({
        where: { id: params.customerId },
        data: { totalPoints: newBalance },
      });

      await tx.transaction.update({
        where: { retailproTransactionId: params.transactionId },
        data: {
          pointsRedeemed: params.pointsToRedeem,
          redemptionAmount: params.pointsToRedeem, // 1 point = 1 currency unit
        },
      });

      await tx.pointsLedger.create({
        data: {
          customerId: params.customerId,
          pointsChange: -params.pointsToRedeem,
          runningBalance: newBalance,
          reason: 'REDEEMED',
          referenceId: params.transactionId,
        },
      });

      this.logger.log(
        {
          customerId: params.customerId,
          pointsRedeemed: params.pointsToRedeem,
          newBalance,
        },
        'Points redeemed',
      );

      return newBalance;
    });

    return { success: true, newBalance: result };
  }

  /** RFM-based segmentation */
  private computeSegment(txCount: number, daysSinceLast: number, lifetimeSale: number): string {
    if (txCount >= 8 && daysSinceLast <= 30 && lifetimeSale >= 50000) return 'champion';
    if (txCount >= 4 && daysSinceLast <= 60) return 'loyal';
    if (txCount >= 2 && daysSinceLast <= 30) return 'potential';
    if (txCount === 1 || daysSinceLast <= 30) return 'new';
    if (daysSinceLast > 180) return 'dormant';
    if (daysSinceLast > 90) return 'at_risk';
    return 'new';
  }

  private async getDefaultTier(tx: typeof this.prisma): Promise<LoyaltyTier> {
    // Use lowest tier by spend threshold (spendFrom = 0)
    const tier = await tx.loyaltyTier.findFirst({ orderBy: { spendFrom: 'asc' } });
    if (!tier) throw new Error('No loyalty tiers configured — add tiers in Configuration');
    return tier;
  }

  private async determineTier(
    tx: typeof this.prisma,
    lifetimeSale: number,
  ): Promise<LoyaltyTier> {
    const tier = await tx.loyaltyTier.findFirst({
      where: {
        spendFrom: { lte: lifetimeSale },
        OR: [{ spendTo: null }, { spendTo: { gte: lifetimeSale } }],
      },
      orderBy: { spendFrom: 'desc' },
    });
    if (!tier) return this.getDefaultTier(tx);
    return tier;
  }

  private async enqueuePointsEarnedNotification(
    customer: Customer & { tier?: LoyaltyTier | null },
    pointsEarned: number,
    totalPoints: number,
    tierName: string,
  ) {
    const config = await this.prisma.whatsappConfig.findFirst({ where: { id: 1, isActive: true } });
    if (!config?.accessToken || !config.templatePointsEarned) return;

    const phone = formatPhoneNumber(customer.mobileNumber, customer.countryCode);
    await this.queue.enqueueWhatsApp({
      to: phone,
      templateName: config.templatePointsEarned,
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: customer.name },
            { type: 'text', text: String(pointsEarned) },
            { type: 'text', text: String(totalPoints) },
            { type: 'text', text: tierName },
          ],
        },
      ],
      customerId: customer.id,
      notificationType: 'points_earned',
    });
  }

  private async enqueueTierUpgradeNotification(
    customer: Customer,
    newTierName: string,
  ) {
    const config = await this.prisma.whatsappConfig.findFirst({ where: { id: 1, isActive: true } });
    if (!config?.accessToken || !config.templateTierUpgrade) return;

    const phone = formatPhoneNumber(customer.mobileNumber, customer.countryCode);
    await this.queue.enqueueWhatsApp({
      to: phone,
      templateName: config.templateTierUpgrade,
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: customer.name },
            { type: 'text', text: newTierName },
          ],
        },
      ],
      customerId: customer.id,
      notificationType: 'tier_upgrade',
    });
  }
}
