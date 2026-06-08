import { z } from 'zod';

const PHONE_ERROR = 'Enter a valid Pakistani mobile number (e.g. 3001234567, 03001234567, or 923001234567)';
const EMAIL_ERROR = 'Enter a valid email address';

/** Strip spaces, dashes, and plus; keep digits only. */
export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Normalize a phone number to local digits only (no country code, no leading zero).
 * "+923001234567" | "923001234567" | "03001234567" | "3001234567"
 * → all return "3001234567" for countryCode "92"
 */
export function normalizeLocalPhone(number: string, countryCode = '92'): string {
  let digits = number.replace(/\D/g, '');
  if (digits.startsWith(countryCode)) digits = digits.slice(countryCode.length);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export function isValidPhoneNumber(value: string, countryCode = '92'): boolean {
  const local = normalizeLocalPhone(value, countryCode);
  return /^3[0-9]{9}$/.test(local);
}

export function isValidEmail(value: string): boolean {
  return z.string().email().safeParse(value.trim()).success;
}

export const phoneNumberSchema = z
  .string()
  .trim()
  .min(1, 'Mobile number is required')
  .refine(isValidPhoneNumber, { message: PHONE_ERROR });

export const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .refine((v) => v === undefined || v === '' || isValidEmail(v), { message: EMAIL_ERROR });

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email(EMAIL_ERROR);
