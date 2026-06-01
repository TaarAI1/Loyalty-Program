import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { calculatePoints, getExpiryDate, formatPhoneNumber, TransactionItemDto } from '@loyalty/shared';
import { LoyaltyTier, Customer } from '@prisma/client';

export interface ProcessTransactionResult {
  success: boolean;
  pointsEarned: number;
  pointsRedeemed: number;
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
    custSid?: string;
    customerMobile: string;
    customerName: string;
    saleAmount: number;
    redeemPoints?: number;
    transactionDate: Date;
    store: string;
    region: string;
    receiptNo?: string;
    outlet?: string;
    countryCode?: string;
    items?: TransactionItemDto[];
  }): Promise<ProcessTransactionResult> {
    const { retailproTransactionId, custSid, customerMobile, customerName, saleAmount, redeemPoints = 0, countryCode = '92' } = params;

    const result = await this.prisma.$transaction(async (tx) => {
      // Look up customer: prefer cust_sid (retailproId) for accuracy, fall back to mobile
      let customer = custSid
        ? await tx.customer.findFirst({
            where: {
              OR: [
                { retailproId: custSid },
                { mobileNumber: customerMobile, countryCode },
              ],
            },
            include: { tier: true },
          })
        : await tx.customer.findFirst({
            where: { mobileNumber: customerMobile, countryCode },
            include: { tier: true },
          });

      const isNewCustomer = !customer;

      if (!customer) {
        const tier = await this.getDefaultTier(tx as typeof this.prisma);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        customer = await (tx.customer.create as any)({
          data: {
            retailproId: custSid ?? null,
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
          { customerId: customer!.id, mobile: customerMobile, custSid },
          'New customer created via webhook',
        );
      } else if (custSid && !customer.retailproId) {
        // Back-fill cust_sid if customer was previously created without it
        await tx.customer.update({
          where: { id: customer.id },
          data: { retailproId: custSid },
        });
        this.logger.log({ customerId: customer.id, custSid }, 'Back-filled cust_sid on existing customer');
      }

      // Non-null assertion: customer is guaranteed assigned at this point
      const c = customer!;

      const currentTierName = c.tier?.name ?? null;

      // Validate redemption: customer must have enough points
      if (redeemPoints > 0 && c.totalPoints < redeemPoints) {
        throw new BadRequestException(
          `Insufficient points: customer has ${c.totalPoints}, requested to redeem ${redeemPoints}`,
        );
      }

      // Payable amount after redemption (1 point = 1 PKR towards the bill)
      const payableAmount = redeemPoints > 0 ? Math.max(0, saleAmount - redeemPoints) : saleAmount;

      // Calculate points earned on payable amount only
      const rewardPct = Number(c.tier?.rewardPercentage ?? 0);
      const pointsEarned = rewardPct > 0 ? calculatePoints(payableAmount, rewardPct) : 0;

      // Count prior transactions for engagement score calculation
      const txCount = await tx.transaction.count({ where: { customerId: c.id } });

      // Calculate new lifetime values (deduct redeemed, add earned)
      const newLifetimeSale = Number(c.lifetimeSale) + saleAmount;
      const newLifetimePoints = c.lifetimePoints + pointsEarned;
      const newTotalPoints = c.totalPoints - redeemPoints + pointsEarned;

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
          pointsRedeemed: redeemPoints,
          redemptionAmount: redeemPoints,   // 1 point = 1 PKR
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

      // Save line items if provided
      if (params.items && params.items.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (tx as any).transactionItem.createMany({
          data: params.items.map((item) => ({
            transactionId: transaction.id,
            sku: item.sku ?? null,
            description: item.description ?? null,
            qty: item.qty,
            unitPrice: item.unit_price,
            totalPrice: item.total_price,
            taxAmount: item.tax_amount ?? null,
            grossAmount: item.gross_amount ?? null,
            netAmount: item.net_amount ?? null,
          })),
        });
      }

      // Points ledger: redemption entry first (so running balance is correct)
      let balanceAfterRedeem = c.totalPoints;
      if (redeemPoints > 0) {
        balanceAfterRedeem = c.totalPoints - redeemPoints;
        await tx.pointsLedger.create({
          data: {
            customerId: c.id,
            transactionId: transaction.id,
            pointsChange: -redeemPoints,
            runningBalance: balanceAfterRedeem,
            reason: 'REDEEMED',
            referenceId: retailproTransactionId,
          },
        });
      }

      // Points ledger: earned entry
      await tx.pointsLedger.create({
        data: {
          customerId: c.id,
          transactionId: transaction.id,
          pointsChange: pointsEarned,
          runningBalance: balanceAfterRedeem + pointsEarned,
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
        redeemPoints,
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
      pointsRedeemed: result.redeemPoints,
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
