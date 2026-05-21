import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PointsService } from './points.service';
import { WebhookTransactionDto, WebhookCustomerDto } from '@loyalty/shared';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly points: PointsService,
  ) {}

  async handleTransaction(dto: WebhookTransactionDto) {
    // Check for duplicate transaction_id directly in the database — transparent and reliable
    const existing = await this.prisma.transaction.findFirst({
      where: { retailproTransactionId: dto.transaction_id },
      select: { id: true, customerId: true, pointsEarned: true, saleAmount: true },
    });

    if (existing) {
      this.logger.warn({ transaction_id: dto.transaction_id }, 'Duplicate transaction_id rejected');
      throw new ConflictException(
        `Transaction ID "${dto.transaction_id}" already exists. Each transaction must have a unique ID.`,
      );
    }

    const result = await this.points.processTransaction({
      retailproTransactionId: dto.transaction_id,
      custSid: dto.cust_sid,
      customerMobile: dto.customer_mobile,
      customerName: dto.customer_name,
      saleAmount: dto.sale_amount,
      redeemPoints: dto.redeem_points ?? 0,
      transactionDate: new Date(dto.transaction_date),
      store: dto.store,
      region: dto.region,
      receiptNo: dto.receipt_no,
      outlet: dto.outlet,
      countryCode: dto.country_code ?? '92',
      items: dto.items,
    });

    const customerSummary = await this.buildCustomerResponse('updated', result.customerId);

    return {
      ...customerSummary,
      points_earned: result.pointsEarned,
      points_redeemed: result.pointsRedeemed,
      tier_upgraded: result.tierUpgraded,
      action: undefined,
    };
  }

  async handleCustomerUpsert(dto: WebhookCustomerDto) {
    const countryCode = dto.country_code ?? '92';

    const existing = await this.prisma.customer.findFirst({
      where: {
        OR: [
          { retailproId: dto.customer_id },
          { mobileNumber: dto.mobile, countryCode },
        ],
      },
    });

    if (existing) {
      await this.prisma.customer.update({
        where: { id: existing.id },
        data: {
          name: dto.name,
          email: dto.email,
          dateOfBirth: dto.dob ? new Date(dto.dob) : undefined,
          gender: dto.gender,
          region: dto.region,
          store: dto.store,
          retailproId: dto.customer_id,
        },
      });
      this.logger.log({ customerId: existing.id }, 'Customer updated via webhook');
      return this.buildCustomerResponse('updated', existing.id);
    }

    // New customer — assign to lowest tier
    const tier = await this.prisma.loyaltyTier.findFirst({ orderBy: { spendFrom: 'asc' } });
    const customer = await this.prisma.customer.create({
      data: {
        retailproId: dto.customer_id,
        name: dto.name,
        mobileNumber: dto.mobile,
        countryCode,
        email: dto.email,
        dateOfBirth: dto.dob ? new Date(dto.dob) : undefined,
        gender: dto.gender,
        region: dto.region,
        store: dto.store,
        tierId: tier?.id,
      },
    });

    this.logger.log({ customerId: customer.id }, 'Customer created via webhook');
    return this.buildCustomerResponse('created', customer.id);
  }

  /** Fetch fresh customer + tier data and build a rich response */
  private async buildCustomerResponse(action: 'created' | 'updated', customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { tier: true },
    });

    if (!customer) return { success: true, action, customer_id: customerId };

    const tier = customer.tier;

    // Next tier (for spend-to-next info)
    const nextTier = await this.prisma.loyaltyTier.findFirst({
      where: { spendFrom: { gt: Number(customer.lifetimeSale) } },
      orderBy: { spendFrom: 'asc' },
    });

    const spendToNext = nextTier
      ? Math.max(0, Number(nextTier.spendFrom) - Number(customer.lifetimeSale))
      : null;

    return {
      success: true,
      action,
      customer: {
        id:            customer.id,
        cust_sid:      customer.retailproId,
        name:          customer.name,
        mobile:        customer.mobileNumber,
        email:         customer.email ?? null,
        store:         customer.store ?? null,
        region:        customer.region ?? null,
        segment:       (customer as Record<string, unknown>)['segment'] ?? null,
      },
      points: {
        available:       customer.totalPoints,
        lifetime_earned: customer.lifetimePoints,
        lifetime_sale:   Number(customer.lifetimeSale),
      },
      tier: {
        id:                 tier?.id ?? null,
        name:               tier?.name ?? null,
        reward_percentage:  tier ? Number(tier.rewardPercentage) : null,
        redeem_value:       tier ? Number((tier as Record<string, unknown>)['redeemValue'] ?? 1) : null,
        spend_from:         tier ? Number(tier.spendFrom) : null,
        spend_to:           tier?.spendTo ? Number(tier.spendTo) : null,
        benefits:           tier?.benefits ?? null,
      },
      next_tier: nextTier ? {
        name:       nextTier.name,
        spend_from: Number(nextTier.spendFrom),
        spend_to_next: spendToNext,
      } : null,
    };
  }
}
