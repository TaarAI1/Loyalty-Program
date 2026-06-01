import { z } from 'zod';

const PHONE_ERROR = 'Enter a valid mobile number (e.g. 3001234567 or 923001234567)';
const EMAIL_ERROR = 'Enter a valid email address';

/** Strip spaces, dashes, and plus; keep digits only. */
export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidPhoneNumber(value: string): boolean {
  const digits = normalizePhoneDigits(value);
  if (digits.length < 10 || digits.length > 15) return false;
  if (digits.length === 10 && /^3[0-9]{9}$/.test(digits)) return true;
  if (digits.length === 11 && /^03[0-9]{9}$/.test(digits)) return true;
  if (digits.length === 12 && /^923[0-9]{9}$/.test(digits)) return true;
  return /^[1-9][0-9]{9,14}$/.test(digits);
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
