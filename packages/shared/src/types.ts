import { TierName, NotificationChannel, NotificationStatus } from './enums';

export interface TierInfo {
  id: number;
  name: TierName;
  rewardPercentage: number;
  pointsFrom: number;
  pointsTo: number | null;
  spendFrom: number;
  spendTo: number | null;
  benefits?: Record<string, unknown>;
}

export interface CustomerSummary {
  id: string;
  name: string;
  mobileNumber: string;
  countryCode: string;
  email?: string;
  tier: TierInfo;
  totalPoints: number;
  lifetimePoints: number;
  lifetimeSale: number;
  lastVisitDate?: Date;
  isActive: boolean;
}

export interface TransactionSummary {
  id: string;
  retailproTransactionId: string;
  transactionDate: Date;
  saleAmount: number;
  pointsEarned: number;
  pointsRedeemed: number;
  redemptionAmount: number;
  receiptNo?: string;
  store: string;
  region: string;
  outlet?: string;
  status: string;
}

export interface PointsLedgerEntry {
  id: number;
  customerId: string;
  transactionId?: string;
  pointsChange: number;
  runningBalance: number;
  reason: string;
  referenceId?: string;
  createdAt: Date;
}

export interface NotificationLogEntry {
  id: number;
  customerId?: string;
  type: string;
  channel: NotificationChannel;
  recipient: string;
  content?: string;
  status: NotificationStatus;
  errorMessage?: string;
  sentAt: Date;
}

export interface DashboardMetrics {
  totalCustomers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  redemptionRate: number;
  activeTiers: number;
  transactionsToday: number;
  revenueToday: number;
}

export interface PointsTrendDataPoint {
  date: string;
  pointsEarned: number;
  pointsRedeemed: number;
  transactions: number;
}

export interface TierDistributionItem {
  tier: TierName;
  count: number;
  percentage: number;
}

// BullMQ job payloads
export interface WhatsAppJobPayload {
  to: string;
  templateName: string;
  components: WhatsAppTemplateComponent[];
  customerId?: string;
  notificationType?: string;
}

export interface SMSJobPayload {
  to: string;
  message: string;
  customerId?: string;
  notificationType?: string;
}

export interface EmailJobPayload {
  to: string;
  subject: string;
  html: string;
  customerId?: string;
  notificationType?: string;
}

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters: Array<{
    type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
    text?: string;
    currency?: { fallback_value: string; code: string; amount_1000: number };
  }>;
}
