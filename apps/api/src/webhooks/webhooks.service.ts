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
      transactionDate: new Date(dto.transaction_date),
      store: dto.store,
      region: dto.region,
      receiptNo: dto.receipt_no,
      outlet: dto.outlet,
      countryCode: dto.country_code ?? '92',
      items: dto.items,
    });

    return {
      success: true,
      points_earned: result.pointsEarned,
      new_tier: result.newTier,
      tier_upgraded: result.tierUpgraded,
      customer_id: result.customerId,
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
      return { success: true, action: 'updated', customer_id: existing.id };
    }

    // New customer — find lowest tier by spend threshold
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
    return { success: true, action: 'created', customer_id: customer.id };
  }
}
