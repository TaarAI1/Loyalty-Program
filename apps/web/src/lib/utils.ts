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
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-PK', {
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

export function segmentColor(segment: string): string {
  switch (segment?.toLowerCase()) {
    case 'champion': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'loyal': return 'bg-green-100 text-green-800 border-green-300';
    case 'potential': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'new': return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'at_risk': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'dormant': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

export function segmentLabel(segment: string): string {
  const map: Record<string, string> = {
    champion: 'Champion',
    loyal: 'Loyal',
    potential: 'Potential',
    new: 'New',
    at_risk: 'At Risk',
    dormant: 'Dormant',
  };
  return map[segment?.toLowerCase()] ?? segment ?? 'Unknown';
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
