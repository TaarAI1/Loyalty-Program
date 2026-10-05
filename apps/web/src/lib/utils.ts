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
      return { background: '#fffde7', color: '#1a1a1a', border: '1px solid #e6cc80', fontWeight: 600 };
    case 'silver':
      return { background: 'linear-gradient(135deg,#ffe066 0%,#ffd700 100%)', color: '#111111', border: '1px solid #d4b800', fontWeight: 700 };
    case 'gold':
      return { background: 'linear-gradient(135deg,#d4a017 0%,#b8860b 100%)', color: '#fffde7', border: '1px solid #7a5c00', fontWeight: 700 };
    case 'platinum':
      return { background: 'linear-gradient(135deg,#222222 0%,#333333 100%)', color: '#ffd700', border: '1px solid #111111', fontWeight: 700 };
    case 'diamond':
      return { background: 'linear-gradient(135deg,#000000 0%,#111111 100%)', color: '#ffd700', border: '1px solid #ffd700', fontWeight: 700 };
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
