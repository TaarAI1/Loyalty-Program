import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
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

      if (!customer) {
        const tier = await this.getDefaultTier(tx as typeof this.prisma);
        customer = await tx.customer.create({
          data: {
            name: customerName,
            mobileNumber: customerMobile,
            countryCode,
            tierId: tier.id,
            store: params.store,
            region: params.region,
          },
          include: { tier: true },
        });
        this.logger.log(
          { customerId: customer.id, mobile: customerMobile },
          'New customer created via webhook',
        );
      }

      const currentTierName = customer.tier?.name ?? null;

      // Determine reward percentage based on current tier
      const rewardPct = Number(customer.tier?.rewardPercentage ?? 4);
      const pointsEarned = calculatePoints(saleAmount, rewardPct);

      // Calculate new lifetime values
      const newLifetimeSale = Number(customer.lifetimeSale) + saleAmount;
      const newLifetimePoints = customer.lifetimePoints + pointsEarned;
      const newTotalPoints = customer.totalPoints + pointsEarned;

      // Find the correct tier for new lifetime sale
      const newTier = await this.determineTier(tx as typeof this.prisma, newLifetimeSale);

      // Create the transaction record
      const transaction = await tx.transaction.create({
        data: {
          retailproTransactionId,
          customerId: customer.id,
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

      // Update customer
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          lifetimeSale: newLifetimeSale,
          lifetimePoints: newLifetimePoints,
          totalPoints: newTotalPoints,
          tierId: newTier.id,
          lastVisitDate: params.transactionDate,
          name: customerName, // keep name in sync
        },
      });

      // Points ledger entry
      await tx.pointsLedger.create({
        data: {
          customerId: customer.id,
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
          customerId: customer.id,
          pointsAmount: pointsEarned,
          earningDate: today,
          expiryDate,
        },
      });

      this.logger.log(
        {
          customerId: customer.id,
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
        customer,
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

  private async getDefaultTier(tx: typeof this.prisma): Promise<LoyaltyTier> {
    const tier = await tx.loyaltyTier.findFirst({ where: { name: 'Classic' } });
    if (!tier) throw new Error('Default tier "Classic" not found — run db:seed');
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
