export enum TierName {
  Classic = 'Classic',
  Silver = 'Silver',
  Gold = 'Gold',
  Platinum = 'Platinum',
}

export enum NotificationChannel {
  WhatsApp = 'whatsapp',
  SMS = 'sms',
  Email = 'email',
}

export enum NotificationStatus {
  Pending = 'pending',
  Sent = 'sent',
  Failed = 'failed',
}

export enum PointsLedgerReason {
  Earned = 'EARNED',
  Redeemed = 'REDEEMED',
  Expiry = 'EXPIRY',
  Manual = 'MANUAL',
  TierBonus = 'TIER_BONUS',
}

export enum TransactionStatus {
  Completed = 'completed',
  Voided = 'voided',
  Pending = 'pending',
}

export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other',
}

export enum ReportType {
  CustomerTierWise = 'PCG-9',
  BirthdayResponse = 'BRR7',
  TopCustomer = 'TCR18',
  LoyaltySalesDetail = 'LSD6',
  Forensic = 'SSFR8',
}
