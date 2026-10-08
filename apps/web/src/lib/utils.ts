import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en').format(n);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

/** Matches Customers grid: +92 3204011823 */
export function formatDisplayPhone(
  raw: string | null | undefined,
  countryCode = '92',
): string {
  if (!raw?.trim()) return '';
  let d = raw.replace(/\D/g, '');
  if (d.startsWith(countryCode)) d = d.slice(countryCode.length);
  if (d.startsWith('0')) d = d.slice(1);
  if (!d) return '';
  return `+${countryCode} ${d}`;
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function tierColor(tier: string): string {
  switch (tier?.toLowerCase()) {
    case 'classic':
      return 'bg-stone-200 text-stone-800 border-stone-400 font-semibold';
    case 'silver':
      return 'bg-slate-300 text-slate-800 border-slate-400 font-semibold';
    case 'gold':
      return 'bg-yellow-400 text-yellow-900 border-yellow-500 font-semibold';
    case 'platinum':
      return 'bg-violet-200 text-violet-900 border-violet-400 font-semibold';
    case 'diamond':
      return 'bg-cyan-200 text-cyan-900 border-cyan-400 font-semibold';
    default:
      return 'bg-gray-200 text-gray-700 border-gray-400 font-semibold';
  }
}

/** Returns inline React styles for a tier — immune to Tailwind purging */
export function tierStyle(tier: string): React.CSSProperties {
  switch (tier?.toLowerCase()) {
    case 'classic':
      return { background: '#FFF7D4', color: '#4C3D3D', border: '1px solid #FFD95A', fontWeight: 700 };
    case 'silver':
      return { background: '#C0C0C0', color: '#2a2a2a', border: '1px solid #9a9a9a', fontWeight: 700 };
    case 'gold':
      return { background: '#D4AF37', color: '#3a2000', border: '1px solid #a07800', fontWeight: 700 };
    case 'platinum':
      return { background: '#7a7a7a', color: '#f0f0f0', border: '1px solid #555555', fontWeight: 700 };
    case 'diamond':
      return { background: '#63B3ED', color: '#0a2040', border: '1px solid #3a8fd4', fontWeight: 700 };
    default:
      return { background: '#e5e7eb', color: '#374151', border: '1px solid #9ca3af', fontWeight: 600 };
  }
}


export function statusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'sent':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'failed':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'pending':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'skipped':
      return 'bg-gray-50 text-gray-500 border-gray-200';
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}
