import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { calculatePoints, formatPhoneNumber, TransactionItemDto } from '@loyalty/shared';
import { LoyaltyTier, Customer } from '@prisma/client';

export interface ProcessTransactionResult {
  success: boolean;
  pointsEarned: number;
  pointsRedeemed: number;
  newTier: string;
  previousTier: string | null;
  tierUpgraded: boolean;
  customerId: string;
  isNewCustomer: boolean;
  enrollmentDiscountPct: number;
  enrollmentDiscountAmount: number;
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
    grossAmount?: number;
    netAmount?: number;
    taxAmount?: number | null;
    redeemPoints?: number;
    transactionDate: Date;
    store: string;
    region: string;
    receiptNo?: string;
    outlet?: string;
    countryCode?: string;
    items?: TransactionItemDto[];
  }): Promise<ProcessTransactionResult> {
    const { retailproTransactionId, custSid, customerMobile, customerName, saleAmount, grossAmount, netAmount, taxAmount, redeemPoints = 0, countryCode = '92' } = params;

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

      // Reject transaction if the customer is blocked
      if (customer && customer.status === 'blocked') {
        throw new BadRequestException(`Customer ${customer.name} (${customer.mobileNumber}) is blocked. Transactions cannot be posted for blocked customers.`);
      }

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

      // Read email config once — used for both earning base and expiry window
      const emailCfg = await tx.emailConfig.findFirst({ where: { id: 1 } });
      const earningBase = emailCfg?.pointsEarningBase ?? 'net_amount';
      const earningAmount =
        earningBase === 'gross_amount' ? (grossAmount ?? saleAmount) :
        earningBase === 'net_amount'   ? (netAmount   ?? saleAmount) :
        saleAmount;

      const rewardPct = Number(c.tier?.rewardPercentage ?? 0);
      const pointsEarned = rewardPct > 0 ? calculatePoints(earningAmount, rewardPct) : 0;

      // Enrollment discount: applies only to brand-new customers on their first purchase
      const enrollmentDiscountPct = (isNewCustomer && emailCfg?.enrollmentDiscountActive && (emailCfg.enrollmentDiscountPct ?? 0) > 0)
        ? emailCfg.enrollmentDiscountPct
        : 0;
      const enrollmentDiscountAmount = enrollmentDiscountPct > 0
        ? Math.round(saleAmount * enrollmentDiscountPct / 100)
        : 0;

      // Count prior transactions for engagement score calculation
      const txCount = await tx.transaction.count({ where: { customerId: c.id } });

      // Calculate new lifetime values — use gross_amount for spend tracking if provided, else sale_amount
      const newLifetimeSale = Number(c.lifetimeSale) + (grossAmount ?? saleAmount);
      const newLifetimePoints = c.lifetimePoints + pointsEarned;
      const newTotalPoints = c.totalPoints - redeemPoints + pointsEarned;

      // Find the correct tier for new lifetime sale
      const newTier = await this.determineTier(tx as typeof this.prisma, newLifetimeSale);

      // Create the transaction record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transaction = await (tx.transaction.create as any)({
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
          taxAmount: taxAmount ?? null,
          grossAmount: grossAmount ?? null,
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
          ...(params.region ? { region: params.region } : {}),
          ...(params.store  ? { store:  params.store  } : {}),
        },
      });

      // Save line items if provided
      if (params.items && params.items.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (tx as any).transactionItem.createMany({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: params.items.map((item: any) => ({
            transactionId: transaction.id,
            sku: item.sku ?? null,
            description: item.description ?? null,
            qty: item.qty ?? 0,
            unitPrice: item.unit_price ?? 0,
            totalPrice: item.total_price ?? 0,
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
        // FIFO: consume oldest-expiring batches first so the expiry job never
        // deducts points the customer has already spent
        await this.consumePointsFIFO(tx, c.id, redeemPoints);
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

      // Points expiry entry; pointsRemaining tracks unconsumed points.
      // Expiry window is read from EmailConfig (configurable via admin UI).
      // Falls back to 365 days if not configured.
      const today = new Date();
      const windowValue = emailCfg?.expiryWindowValue ?? 365;
      const windowUnit  = emailCfg?.expiryWindowUnit  ?? 'days';
      const msMap: Record<string, number> = {
        minutes: 60 * 1000,
        hours:   60 * 60 * 1000,
        days:    24 * 60 * 60 * 1000,
      };
      const expiryDate = new Date(today.getTime() + windowValue * (msMap[windowUnit] ?? msMap['days']));
      await tx.pointsExpiry.create({
        data: {
          customerId: c.id,
          pointsAmount: pointsEarned,
          pointsRemaining: pointsEarned,
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
        isNewCustomer,
        enrollmentDiscountPct,
        enrollmentDiscountAmount,
      };
    });

    const tierUpgraded = result.newTier.name !== result.previousTierName;

    // Enqueue registration WhatsApp for brand-new customers
    if (result.isNewCustomer) {
      try {
        const waConfig = await this.prisma.whatsappConfig.findFirst({ where: { id: 1, isActive: true } });
        if (waConfig?.apiUrl && waConfig.templatePointsEarned) {
          const phone = formatPhoneNumber(result.customer.mobileNumber, result.customer.countryCode);
          await this.queue.enqueueWhatsApp({
            to: phone,
            templateName: waConfig.templatePointsEarned,
            customerName: result.customer.name,
            vars: {
              order_no_1:        waConfig.regVarOrderNo1    ?? '',
              dispatched_order1: waConfig.regVarDispatched1 ?? '',
            },
            customerId: result.customer.id,
            notificationType: 'registration',
          });
          this.logger.log({ customerId: result.customer.id, phone }, 'Registration WhatsApp queued');
        }
      } catch (err) {
        this.logger.error({ err, customerId: result.customer.id }, 'Failed to queue registration WhatsApp');
      }
    }

    // Enqueue transaction WhatsApp notification
    try {
      const waConfig = await this.prisma.whatsappConfig.findFirst({ where: { id: 1, isActive: true } });
      if (waConfig?.apiUrl && waConfig.templateTierUpgrade) {
        const phone = formatPhoneNumber(result.customer.mobileNumber, result.customer.countryCode);
        await this.queue.enqueueWhatsApp({
          to: phone,
          templateName: waConfig.templateTierUpgrade,
          customerName: result.customer.name,
          vars: {
            sms_invoice:     String(result.transaction.saleAmount  || 0),
            sms_no:          result.transaction.receiptNo           || result.transaction.retailproTransactionId || 'N/A',
            remaing_balance: String(result.newTotalPoints          ?? 0),
          },
          customerId: result.customer.id,
          notificationType: 'transaction',
        });
        this.logger.log({ customerId: result.customer.id, phone }, 'Transaction WhatsApp queued');
      }
    } catch (err) {
      this.logger.error({ err, customerId: result.customer.id }, 'Failed to queue transaction WhatsApp');
    }

    // Tier-upgrade notification (no longer sending points-earned or tier-upgrade WhatsApp
    // since the transaction WhatsApp above covers the per-transaction notification)

    return {
      success: true,
      pointsEarned: result.pointsEarned,
      pointsRedeemed: result.redeemPoints,
      newTier: result.newTier.name,
      previousTier: result.previousTierName,
      tierUpgraded,
      customerId: result.customer.id,
      isNewCustomer: result.isNewCustomer,
      enrollmentDiscountPct: result.enrollmentDiscountPct,
      enrollmentDiscountAmount: result.enrollmentDiscountAmount,
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

      // FIFO: consume oldest-expiring batches so the expiry job never double-deducts
      await this.consumePointsFIFO(tx, params.customerId, params.pointsToRedeem);

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

  /**
   * FIFO expiry batch consumption.
   * When a customer redeems points, reduce pointsRemaining on the oldest-expiring
   * active batches first. This ensures the nightly expiry job only ever deducts
   * points that have NOT already been spent.
   *
   * Must be called inside an active Prisma $transaction.
   */
  private async consumePointsFIFO(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    customerId: string,
    pointsToConsume: number,
  ): Promise<void> {
    if (pointsToConsume <= 0) return;

    // Fetch active batches with remaining points, oldest expiry date first
    const batches = await tx.pointsExpiry.findMany({
      where: {
        customerId,
        isExpired: false,
        pointsRemaining: { gt: 0 },
      },
      orderBy: { expiryDate: 'asc' },
    });

    let remaining = pointsToConsume;

    for (const batch of batches) {
      if (remaining <= 0) break;

      const consume = Math.min(batch.pointsRemaining, remaining);

      await tx.pointsExpiry.update({
        where: { id: batch.id },
        data: { pointsRemaining: { decrement: consume } },
      });

      remaining -= consume;
    }

    // If remaining > 0 after consuming all batches it means something is
    // inconsistent (should not happen since balance is validated before redeem)
    if (remaining > 0) {
      this.logger.warn(
        { customerId, pointsToConsume, unaccounted: remaining },
        'FIFO consumption: could not fully account for redeemed points across expiry batches',
      );
    }
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
    if (!config?.apiUrl || !config.templatePointsEarned) return;

    const phone = formatPhoneNumber(customer.mobileNumber, customer.countryCode);
    await this.queue.enqueueWhatsApp({
      to: phone,
      templateName: config.templatePointsEarned,
      customerName: customer.name,
      vars: {
        points_earned: String(pointsEarned),
        total_points:  String(totalPoints),
        tier:          tierName,
      },
      customerId: customer.id,
      notificationType: 'points_earned',
    });
  }

  private async enqueueTierUpgradeNotification(
    customer: Customer,
    newTierName: string,
  ) {
    const config = await this.prisma.whatsappConfig.findFirst({ where: { id: 1, isActive: true } });
    if (!config?.apiUrl || !config.templateTierUpgrade) return;

    const phone = formatPhoneNumber(customer.mobileNumber, customer.countryCode);
    await this.queue.enqueueWhatsApp({
      to: phone,
      templateName: config.templateTierUpgrade,
      customerName: customer.name,
      vars: {
        tier: newTierName,
      },
      customerId: customer.id,
      notificationType: 'tier_upgrade',
    });
  }
}
