/**
 * Formats a phone number by normalising country code prefix.
 * Strips non-digits, removes leading zero, prepends countryCode if absent.
 */
export function formatPhoneNumber(number: string, countryCode = '92'): string {
  let cleaned = number.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.startsWith(countryCode)) {
    return cleaned;
  }
  return countryCode + cleaned;
}

/**
 * Calculates points earned for a sale amount at a given reward percentage.
 * Standard loyalty practice: round to nearest integer.
 */
export function calculatePoints(saleAmount: number, rewardPercentage: number): number {
  return Math.round((saleAmount * rewardPercentage) / 100);
}

/**
 * Returns a date 365 days from the given date (rolling expiry policy).
 */
export function getExpiryDate(earningDate: Date): Date {
  const expiry = new Date(earningDate);
  expiry.setDate(expiry.getDate() + 365);
  return expiry;
}

/**
 * Generates a birthday discount code.
 */
export function generateBirthdayCode(customerId: string, date: Date): string {
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `BDAY30-${customerId.slice(0, 8).toUpperCase()}-${yyyymmdd}`;
}
