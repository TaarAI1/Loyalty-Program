import { z } from 'zod';
export declare const WebhookTransactionSchema: z.ZodObject<{
    transaction_id: z.ZodString;
    customer_mobile: z.ZodString;
    customer_name: z.ZodString;
    sale_amount: z.ZodNumber;
    transaction_date: z.ZodString;
    store: z.ZodString;
    region: z.ZodString;
    receipt_no: z.ZodOptional<z.ZodString>;
    outlet: z.ZodOptional<z.ZodString>;
    country_code: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    transaction_id: string;
    customer_mobile: string;
    customer_name: string;
    sale_amount: number;
    transaction_date: string;
    store: string;
    region: string;
    country_code: string;
    receipt_no?: string | undefined;
    outlet?: string | undefined;
}, {
    transaction_id: string;
    customer_mobile: string;
    customer_name: string;
    sale_amount: number;
    transaction_date: string;
    store: string;
    region: string;
    receipt_no?: string | undefined;
    outlet?: string | undefined;
    country_code?: string | undefined;
}>;
export type WebhookTransactionDto = z.infer<typeof WebhookTransactionSchema>;
export declare const WebhookCustomerSchema: z.ZodObject<{
    customer_id: z.ZodString;
    name: z.ZodString;
    mobile: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    dob: z.ZodOptional<z.ZodString>;
    gender: z.ZodOptional<z.ZodEnum<["Male", "Female", "Other"]>>;
    region: z.ZodOptional<z.ZodString>;
    store: z.ZodOptional<z.ZodString>;
    country_code: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    country_code: string;
    customer_id: string;
    name: string;
    mobile: string;
    email?: string | undefined;
    store?: string | undefined;
    region?: string | undefined;
    dob?: string | undefined;
    gender?: "Male" | "Female" | "Other" | undefined;
}, {
    customer_id: string;
    name: string;
    mobile: string;
    email?: string | undefined;
    store?: string | undefined;
    region?: string | undefined;
    country_code?: string | undefined;
    dob?: string | undefined;
    gender?: "Male" | "Female" | "Other" | undefined;
}>;
export type WebhookCustomerDto = z.infer<typeof WebhookCustomerSchema>;
export declare const LoyaltyTierSchema: z.ZodObject<{
    name: z.ZodString;
    points_from: z.ZodNumber;
    points_to: z.ZodNullable<z.ZodNumber>;
    spend_from: z.ZodNumber;
    spend_to: z.ZodNullable<z.ZodNumber>;
    reward_percentage: z.ZodNumber;
    benefits: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    points_from: number;
    points_to: number | null;
    spend_from: number;
    spend_to: number | null;
    reward_percentage: number;
    benefits?: Record<string, unknown> | undefined;
}, {
    name: string;
    points_from: number;
    points_to: number | null;
    spend_from: number;
    spend_to: number | null;
    reward_percentage: number;
    benefits?: Record<string, unknown> | undefined;
}>;
export type LoyaltyTierDto = z.infer<typeof LoyaltyTierSchema>;
export declare const WhatsAppConfigSchema: z.ZodObject<{
    access_token: z.ZodString;
    phone_number_id: z.ZodString;
    business_account_id: z.ZodString;
    template_expiry: z.ZodString;
    template_birthday: z.ZodString;
    template_points_earned: z.ZodString;
    template_tier_upgrade: z.ZodString;
    is_active: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    access_token: string;
    phone_number_id: string;
    business_account_id: string;
    template_expiry: string;
    template_birthday: string;
    template_points_earned: string;
    template_tier_upgrade: string;
    is_active: boolean;
}, {
    access_token: string;
    phone_number_id: string;
    business_account_id: string;
    template_expiry: string;
    template_birthday: string;
    template_points_earned: string;
    template_tier_upgrade: string;
    is_active?: boolean | undefined;
}>;
export type WhatsAppConfigDto = z.infer<typeof WhatsAppConfigSchema>;
export declare const ReportFilterSchema: z.ZodObject<{
    region: z.ZodOptional<z.ZodString>;
    store: z.ZodOptional<z.ZodString>;
    tier_id: z.ZodOptional<z.ZodNumber>;
    gender: z.ZodOptional<z.ZodEnum<["Male", "Female", "Other"]>>;
    age_from: z.ZodOptional<z.ZodNumber>;
    age_to: z.ZodOptional<z.ZodNumber>;
    date_from: z.ZodOptional<z.ZodString>;
    date_to: z.ZodOptional<z.ZodString>;
    month: z.ZodOptional<z.ZodNumber>;
    year: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    page: z.ZodDefault<z.ZodNumber>;
    page_size: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    page_size: number;
    store?: string | undefined;
    region?: string | undefined;
    gender?: "Male" | "Female" | "Other" | undefined;
    tier_id?: number | undefined;
    age_from?: number | undefined;
    age_to?: number | undefined;
    date_from?: string | undefined;
    date_to?: string | undefined;
    month?: number | undefined;
    year?: number | undefined;
}, {
    store?: string | undefined;
    region?: string | undefined;
    gender?: "Male" | "Female" | "Other" | undefined;
    tier_id?: number | undefined;
    age_from?: number | undefined;
    age_to?: number | undefined;
    date_from?: string | undefined;
    date_to?: string | undefined;
    month?: number | undefined;
    year?: number | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    page_size?: number | undefined;
}>;
export type ReportFilterDto = z.infer<typeof ReportFilterSchema>;
export declare const RedeemPointsSchema: z.ZodObject<{
    points_to_redeem: z.ZodNumber;
    transaction_id: z.ZodString;
    store: z.ZodString;
    region: z.ZodString;
}, "strip", z.ZodTypeAny, {
    transaction_id: string;
    store: string;
    region: string;
    points_to_redeem: number;
}, {
    transaction_id: string;
    store: string;
    region: string;
    points_to_redeem: number;
}>;
export type RedeemPointsDto = z.infer<typeof RedeemPointsSchema>;
export declare const WhatsAppTestSchema: z.ZodObject<{
    to: z.ZodString;
    template_name: z.ZodString;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    to: string;
    template_name: string;
    message?: string | undefined;
}, {
    to: string;
    template_name: string;
    message?: string | undefined;
}>;
export type WhatsAppTestDto = z.infer<typeof WhatsAppTestSchema>;
//# sourceMappingURL=schemas.d.ts.map