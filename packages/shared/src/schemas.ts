import { z } from 'zod';
import { optionalEmailSchema, phoneNumberSchema } from './validation';

// ── Webhook: Transaction Item ──────────────────────────────────────────────────
export const TransactionItemSchema = z.object({
  sku:          z.string().max(100).optional(),
  description:  z.string().max(500).optional(),
  qty:          z.number().positive(),
  unit_price:   z.number().nonnegative(),
  total_price:  z.number().nonnegative(),
  tax_amount:   z.number().nonnegative().optional(),
  gross_amount: z.number().nonnegative().optional(),
  net_amount:   z.number().nonnegative().optional(),
});
export type TransactionItemDto = z.infer<typeof TransactionItemSchema>;

// ── Webhook: Inbound Transaction ──────────────────────────────────────────────
export const WebhookTransactionSchema = z.object({
  transaction_id:  z.string().min(1),
  cust_sid:        z.string().max(100).optional(),   // POS system customer ID — preferred lookup key
  customer_mobile: phoneNumberSchema,
  customer_name:   z.string().min(1).max(255),
  sale_amount:     z.number().positive(),
  transaction_date: z.string().datetime(),
  store:           z.string().min(1).max(100),
  region:          z.string().min(1).max(100),
  receipt_no:      z.string().max(100).optional(),
  outlet:          z.string().max(100).optional(),
  country_code:    z.string().max(5).default('92'),
  redeem_points:   z.number().int().nonnegative().default(0),  // 0 = no redemption
  items:           z.array(TransactionItemSchema).optional(),
});
export type WebhookTransactionDto = z.infer<typeof WebhookTransactionSchema>;

// ── Webhook: Inbound Customer ─────────────────────────────────────────────────
export const WebhookCustomerSchema = z.object({
  customer_id: z.string().min(1),
  name: z.string().min(1).max(255),
  mobile: phoneNumberSchema,
  email: optionalEmailSchema,
  dob: z.string().optional().transform((v) => v === '' ? undefined : v),
  gender: z.string().optional().transform((v) => v === '' ? undefined : v)
    .pipe(z.enum(['Male', 'Female', 'Other']).optional()),
  region: z.string().optional().transform((v) => v === '' ? undefined : v),
  store: z.string().max(100).optional().transform((v) => v === '' ? undefined : v),
  country_code: z.string().max(5).default('92'),
});
export type WebhookCustomerDto = z.infer<typeof WebhookCustomerSchema>;

export const CustomerUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: optionalEmailSchema,
  dateOfBirth: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  region: z.string().max(100).optional(),
  store: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});
export type CustomerUpdateDto = z.infer<typeof CustomerUpdateSchema>;

// ── Loyalty Tier ──────────────────────────────────────────────────────────────
export const LoyaltyTierSchema = z.object({
  name: z.string().min(1).max(50),
  points_from: z.number().int().nonnegative(),
  points_to: z.number().int().positive().nullable(),
  spend_from: z.number().nonnegative(),
  spend_to: z.number().positive().nullable(),
  reward_percentage: z.number().positive().max(100),
  benefits: z.record(z.unknown()).optional(),
});
export type LoyaltyTierDto = z.infer<typeof LoyaltyTierSchema>;

// ── WhatsApp Config ───────────────────────────────────────────────────────────
export const WhatsAppConfigSchema = z.object({
  access_token: z.string().min(1),
  phone_number_id: z.string().min(1),
  business_account_id: z.string().min(1),
  template_expiry: z.string().min(1),
  template_birthday: z.string().min(1),
  template_points_earned: z.string().min(1),
  template_tier_upgrade: z.string().min(1),
  is_active: z.boolean().default(true),
});
export type WhatsAppConfigDto = z.infer<typeof WhatsAppConfigSchema>;

// ── Report Filters ────────────────────────────────────────────────────────────
export const ReportFilterSchema = z.object({
  region: z.string().optional(),
  store: z.string().optional(),
  tier_id: z.coerce.number().int().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  age_from: z.coerce.number().int().optional(),
  age_to: z.coerce.number().int().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).optional(),
  limit: z.coerce.number().int().positive().default(100),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(500).default(50),
});
export type ReportFilterDto = z.infer<typeof ReportFilterSchema>;

// ── Redemption ────────────────────────────────────────────────────────────────
export const RedeemPointsSchema = z.object({
  points_to_redeem: z.number().int().positive(),
  transaction_id: z.string().min(1),
  store: z.string().min(1),
  region: z.string().min(1),
});
export type RedeemPointsDto = z.infer<typeof RedeemPointsSchema>;

// ── WhatsApp Test ─────────────────────────────────────────────────────────────
export const WhatsAppTestSchema = z.object({
  to: phoneNumberSchema,
  template_name: z.string().min(1),
  message: z.string().min(1).optional(),
});
export type WhatsAppTestDto = z.infer<typeof WhatsAppTestSchema>;
