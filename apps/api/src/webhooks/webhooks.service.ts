import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IdempotencyService } from './idempotency.service';
import { PointsService } from './points.service';
import { WebhookTransactionDto, WebhookCustomerDto } from '@loyalty/shared';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: IdempotencyService,
    private readonly points: PointsService,
  ) {}

  async handleTransaction(dto: WebhookTransactionDto, idempotencyKey: string) {
    // Return cached response for duplicate requests
    const cached = await this.idempotency.get<unknown>(idempotencyKey);
    if (cached) {
      this.logger.log({ idempotencyKey }, 'Idempotent replay – returning cached response');
      return cached;
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

    const response = {
      success: true,
      points_earned: result.pointsEarned,
      new_tier: result.newTier,
      tier_upgraded: result.tierUpgraded,
      customer_id: result.customerId,
    };

    // Cache result for 24h
    await this.idempotency.set(idempotencyKey, response);
    return response;
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
