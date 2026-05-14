"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppTestSchema = exports.RedeemPointsSchema = exports.ReportFilterSchema = exports.WhatsAppConfigSchema = exports.LoyaltyTierSchema = exports.WebhookCustomerSchema = exports.WebhookTransactionSchema = void 0;
const zod_1 = require("zod");
exports.WebhookTransactionSchema = zod_1.z.object({
    transaction_id: zod_1.z.string().min(1),
    customer_mobile: zod_1.z.string().min(7).max(20),
    customer_name: zod_1.z.string().min(1).max(255),
    sale_amount: zod_1.z.number().positive(),
    transaction_date: zod_1.z.string().datetime(),
    store: zod_1.z.string().min(1).max(100),
    region: zod_1.z.string().min(1).max(100),
    receipt_no: zod_1.z.string().max(100).optional(),
    outlet: zod_1.z.string().max(100).optional(),
    country_code: zod_1.z.string().max(5).default('92'),
});
exports.WebhookCustomerSchema = zod_1.z.object({
    customer_id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1).max(255),
    mobile: zod_1.z.string().min(7).max(20),
    email: zod_1.z.string().email().optional(),
    dob: zod_1.z.string().optional(),
    gender: zod_1.z.enum(['Male', 'Female', 'Other']).optional(),
    region: zod_1.z.string().max(100).optional(),
    store: zod_1.z.string().max(100).optional(),
    country_code: zod_1.z.string().max(5).default('92'),
});
exports.LoyaltyTierSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(50),
    points_from: zod_1.z.number().int().nonnegative(),
    points_to: zod_1.z.number().int().positive().nullable(),
    spend_from: zod_1.z.number().nonnegative(),
    spend_to: zod_1.z.number().positive().nullable(),
    reward_percentage: zod_1.z.number().positive().max(100),
    benefits: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.WhatsAppConfigSchema = zod_1.z.object({
    access_token: zod_1.z.string().min(1),
    phone_number_id: zod_1.z.string().min(1),
    business_account_id: zod_1.z.string().min(1),
    template_expiry: zod_1.z.string().min(1),
    template_birthday: zod_1.z.string().min(1),
    template_points_earned: zod_1.z.string().min(1),
    template_tier_upgrade: zod_1.z.string().min(1),
    is_active: zod_1.z.boolean().default(true),
});
exports.ReportFilterSchema = zod_1.z.object({
    region: zod_1.z.string().optional(),
    store: zod_1.z.string().optional(),
    tier_id: zod_1.z.coerce.number().int().optional(),
    gender: zod_1.z.enum(['Male', 'Female', 'Other']).optional(),
    age_from: zod_1.z.coerce.number().int().optional(),
    age_to: zod_1.z.coerce.number().int().optional(),
    date_from: zod_1.z.string().optional(),
    date_to: zod_1.z.string().optional(),
    month: zod_1.z.coerce.number().int().min(1).max(12).optional(),
    year: zod_1.z.coerce.number().int().min(2000).optional(),
    limit: zod_1.z.coerce.number().int().positive().default(100),
    page: zod_1.z.coerce.number().int().positive().default(1),
    page_size: zod_1.z.coerce.number().int().positive().max(500).default(50),
});
exports.RedeemPointsSchema = zod_1.z.object({
    points_to_redeem: zod_1.z.number().int().positive(),
    transaction_id: zod_1.z.string().min(1),
    store: zod_1.z.string().min(1),
    region: zod_1.z.string().min(1),
});
exports.WhatsAppTestSchema = zod_1.z.object({
    to: zod_1.z.string().min(7).max(20),
    template_name: zod_1.z.string().min(1),
    message: zod_1.z.string().min(1).optional(),
});
//# sourceMappingURL=schemas.js.map