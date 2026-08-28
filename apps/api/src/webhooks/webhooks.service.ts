import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PointsService } from './points.service';
import { QueueService } from '../queue/queue.service';
import { WebhookTransactionDto, WebhookCustomerDto, normalizeLocalPhone, formatPhoneNumber } from '@loyalty/shared';
import axios from 'axios';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly points: PointsService,
    private readonly queue: QueueService,
  ) {}

  async handleTransaction(dto: WebhookTransactionDto) {
    const transactionId = dto.transaction_id ?? crypto.randomUUID();

    // Check for duplicate transaction_id — skip check for auto-generated UUIDs
    if (dto.transaction_id) {
      const existing = await this.prisma.transaction.findFirst({
        where: { retailproTransactionId: transactionId },
        select: { id: true },
      });
      if (existing) {
        this.logger.warn({ transaction_id: transactionId }, 'Duplicate transaction_id rejected');
        throw new ConflictException(
          `Transaction ID "${transactionId}" already exists. Each transaction must have a unique ID.`,
        );
      }
    }

    const transactionDate = dto.transaction_date
      ? (isNaN(new Date(dto.transaction_date).getTime()) ? new Date() : new Date(dto.transaction_date))
      : new Date();

    const txTaxAmount = dto.items
      ? dto.items.reduce((sum, i) => sum + (i.tax_amount ?? 0), 0)
      : (dto.tax_amount ?? null);

    const cc = dto.country_code ?? '92';
    const customerMobile = normalizeLocalPhone(dto.customer_mobile, cc);

    const itemsGross  = dto.items ? dto.items.reduce((sum, i) => sum + (i.gross_amount ?? 0), 0) : 0;
    const itemsNet    = dto.items ? dto.items.reduce((sum, i) => sum + (i.net_amount   ?? 0), 0) : 0;
    const grossAmount = itemsGross > 0 ? itemsGross : (dto.gross_amount ?? null);
    const netAmount   = itemsNet   > 0 ? itemsNet   : (dto.net_amount   ?? null);

    const result = await this.points.processTransaction({
      retailproTransactionId: transactionId,
      custSid: dto.cust_sid,
      customerMobile,
      customerName: dto.customer_name,
      saleAmount: dto.sale_amount,
      grossAmount: grossAmount ?? undefined,
      netAmount: netAmount ?? undefined,
      taxAmount: txTaxAmount,
      redeemPoints: dto.redeem_points ?? 0,
      transactionDate,
      store: dto.store,
      region: dto.region,
      receiptNo: dto.receipt_no,
      outlet: dto.outlet,
      countryCode: cc,
      items: dto.items,
    });

    const customerSummary = await this.buildCustomerResponse('updated', result.customerId);

    return {
      ...customerSummary,
      points_earned:               result.pointsEarned,
      points_redeemed:             result.pointsRedeemed,
      tier_upgraded:               result.tierUpgraded,
      tax_amount:                  txTaxAmount,
      gross_amount:                grossAmount,
      net_amount:                  netAmount,
      is_new_customer:             result.isNewCustomer,
      enrollment_discount_pct:     result.enrollmentDiscountPct,
      enrollment_discount_amount:  result.enrollmentDiscountAmount,
      action: undefined,
    };
  }

  async handleCustomerUpsert(dto: WebhookCustomerDto) {
    const countryCode = dto.country_code ?? '92';
    const mobileNumber = normalizeLocalPhone(dto.mobile, countryCode);

    const existing = await this.prisma.customer.findFirst({
      where: {
        OR: [
          { retailproId: dto.customer_id },
          { mobileNumber, countryCode },
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
          mobileNumber,
          preferredName:   dto.preferred_name,
          nationality:     dto.nationality,
          city:            dto.city,
          homeAddress:     dto.home_address,
          maritalStatus:   dto.marital_status,
          deliveryAddress: dto.delivery_address,
          alternatePhone:  dto.alternate_phone,
          occupation:      dto.occupation,
        },
      });
      this.logger.log({ customerId: existing.id }, 'Customer updated via webhook');
      return this.buildCustomerResponse('updated', existing.id);
    }

    // New customer — assign to lowest tier
    const tier = await this.prisma.loyaltyTier.findFirst({ orderBy: { spendFrom: 'asc' } });
    const customer = await this.prisma.customer.create({
      data: {
        retailproId:     dto.customer_id,
        name:            dto.name,
        mobileNumber,
        countryCode,
        email:           dto.email,
        dateOfBirth:     dto.dob ? new Date(dto.dob) : undefined,
        gender:          dto.gender,
        region:          dto.region,
        store:           dto.store,
        tierId:          tier?.id,
        preferredName:   dto.preferred_name,
        nationality:     dto.nationality,
        city:            dto.city,
        homeAddress:     dto.home_address,
        maritalStatus:   dto.marital_status,
        deliveryAddress: dto.delivery_address,
        alternatePhone:  dto.alternate_phone,
        occupation:      dto.occupation,
      },
    });

    this.logger.log({ customerId: customer.id }, 'Customer created via webhook');

    // Send registration WhatsApp message
    try {
      const waConfig = await this.prisma.whatsappConfig.findFirst({ where: { id: 1, isActive: true } });
      if (waConfig?.apiUrl && waConfig.templatePointsEarned) {
        const phone = formatPhoneNumber(customer.mobileNumber, customer.countryCode);
        await this.queue.enqueueWhatsApp({
          to: phone,
          templateName: waConfig.templatePointsEarned,
          customerName: customer.name,
          vars: {
            order_no_1:        waConfig.regVarOrderNo1    ?? '',
            dispatched_order1: waConfig.regVarDispatched1 ?? '',
          },
          customerId: customer.id,
          notificationType: 'registration',
        });
        this.logger.log({ customerId: customer.id, phone }, 'Registration WhatsApp queued');
      }
    } catch (err) {
      this.logger.error({ err, customerId: customer.id }, 'Failed to queue registration WhatsApp');
    }

    return this.buildCustomerResponse('created', customer.id);
  }

  /** Fetch stores from Prism API filtered by subsidiary SID — equivalent to
   *  SELECT * FROM rps.store WHERE SBS_SID = '<RETAILPRO_SUBSIDIARY_SID>' */
  async getStores(): Promise<{ name: string; code: string }[]> {
    const baseUrl = process.env['RETAILPRO_BASE_URL'];
    const subsidiarySid = process.env['RETAILPRO_SUBSIDIARY_SID'];
    if (!baseUrl) {
      this.logger.warn('RETAILPRO_BASE_URL not set — returning empty store list');
      return [];
    }

    const url = `${baseUrl.replace(/\/$/, '')}/v1/rest/store`;
    const params: Record<string, string> = {
      cols: 'sid,store_name,store_number,store_code,active',
      filter: `(active,eq,true)${subsidiarySid ? `AND(subsidiary_sid,eq,${subsidiarySid})` : ''}`,
      sort: 'store_code,asc',
    };

    try {
      const response = await axios.get(url, { params, timeout: 8000 });
      const data = response.data;
      const records: Record<string, string>[] = Array.isArray(data)
        ? data
        : (data?.Records ?? data?.records ?? []);
      return records.map((r) => ({
        name: r['store_name'] ?? '',
        code: r['store_code'] ?? '',
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error({ message }, 'Failed to fetch stores from Prism');
      return [];
    }
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
