/** Stored customer segment slugs (unchanged for UI/API compatibility). */
export type SegmentSlug =
  | 'champion'
  | 'loyal'
  | 'potential'
  | 'new'
  | 'at_risk'
  | 'dormant';

export interface SegmentWeights {
  lifetime: number;
  txCount: number;
  frequency: number;
  recency: number;
  aov: number;
  rank: number;
}

export interface SegmentConfig {
  weights: SegmentWeights;
  /** Absolute VIP / champion lifetime spend (PKR). */
  vipLifetimeSpend: number;
  loyalMinLifetimeSpend: number;
  loyalMinTxCount: number;
  loyalMinAov: number;
  potentialMinTxCount: number;
  recencyActiveDays: number;
  recencyAtRiskDays: number;
  recencyDormantDays: number;
}

export const DEFAULT_SEGMENT_CONFIG: SegmentConfig = {
  weights: {
    lifetime: 0.35,
    txCount: 0.2,
    frequency: 0.15,
    recency: 0.15,
    aov: 0.1,
    rank: 0.05,
  },
  vipLifetimeSpend: 500_000,
  loyalMinLifetimeSpend: 25_000,
  loyalMinTxCount: 4,
  loyalMinAov: 1_000,
  potentialMinTxCount: 2,
  recencyActiveDays: 30,
  recencyAtRiskDays: 90,
  recencyDormantDays: 180,
};

export interface CustomerSegmentInput {
  completedTxCount: number;
  lifetimeSale: number;
  lastVisitDate: Date | null;
  firstVisitDate: Date | null;
  tierName?: string | null;
  asOfDate?: Date;
}

export interface PopulationBenchmarks {
  spendP95?: number;
  spendMedian?: number;
  spendP75?: number;
  visitMedian?: number;
  visitP75?: number;
}

export interface SegmentExplain {
  segment: SegmentSlug;
  compositeScore: number;
  rule: string;
  recencyDays: number | null;
  avgOrderValue: number;
  subScores: {
    lifetime: number;
    txCount: number;
    frequency: number;
    recency: number;
    aov: number;
    rank: number;
  };
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function buildExplain(
  segment: SegmentSlug,
  rule: string,
  compositeScore: number,
  recencyDays: number | null,
  avgOrderValue: number,
  subScores: SegmentExplain['subScores'],
): SegmentExplain {
  return {
    segment,
    compositeScore: Math.round(compositeScore * 1000) / 1000,
    rule,
    recencyDays,
    avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    subScores,
  };
}

/** Spend bar for loyal: population median/P75 with config floor. */
export function resolveSpendBenchmark(
  config: SegmentConfig,
  benchmarks: PopulationBenchmarks,
): number {
  const fromPop = benchmarks.spendMedian ?? benchmarks.spendP75;
  if (fromPop != null && fromPop > 0) {
    return Math.max(config.loyalMinLifetimeSpend, fromPop);
  }
  return config.loyalMinLifetimeSpend;
}

/** Visit bar for loyal: population median/P75 with config floor. */
export function resolveVisitBenchmark(
  config: SegmentConfig,
  benchmarks: PopulationBenchmarks,
): number {
  const fromPop = benchmarks.visitMedian ?? benchmarks.visitP75;
  if (fromPop != null && fromPop > 0) {
    return Math.max(config.loyalMinTxCount, Math.ceil(fromPop));
  }
  return config.loyalMinTxCount;
}

/**
 * Assign segment from completed transaction history and visit recency.
 * Loyal = high spend AND high visits (vs population). Lower spend → potential.
 */
export function computeCustomerSegment(
  input: CustomerSegmentInput,
  config: SegmentConfig = DEFAULT_SEGMENT_CONFIG,
  benchmarks: PopulationBenchmarks = {},
): SegmentExplain {
  const asOf = input.asOfDate ?? new Date();
  const tx = Math.max(0, Math.floor(input.completedTxCount));
  const spend = Math.max(0, Number(input.lifetimeSale) || 0);
  const aov = tx > 0 ? spend / tx : 0;
  const recencyDays =
    input.lastVisitDate != null ? Math.max(0, daysBetween(input.lastVisitDate, asOf)) : null;

  const tenureDays =
    input.firstVisitDate && input.lastVisitDate
      ? Math.max(1, daysBetween(input.firstVisitDate, input.lastVisitDate))
      : Math.max(1, tx);
  const frequencyPerDay = tx / tenureDays;

  const spendNormCap = benchmarks.spendP95 ?? config.vipLifetimeSpend * 2;
  const subScores = {
    lifetime: clamp01(spend / spendNormCap),
    txCount: clamp01(tx / 20),
    frequency: clamp01(frequencyPerDay * 30),
    recency:
      recencyDays !== null
        ? clamp01(1 - recencyDays / config.recencyActiveDays)
        : 0.5,
    aov: clamp01(aov / 50_000),
    rank:
      benchmarks.spendP95 != null && spend >= benchmarks.spendP95
        ? 1
        : clamp01(spend / config.vipLifetimeSpend),
  };

  const w = config.weights;
  const compositeScore =
    subScores.lifetime * w.lifetime +
    subScores.txCount * w.txCount +
    subScores.frequency * w.frequency +
    subScores.recency * w.recency +
    subScores.aov * w.aov +
    subScores.rank * w.rank;

  if (tx === 0) {
    return buildExplain('new', 'no_completed_transactions', compositeScore, recencyDays, aov, subScores);
  }

  if (recencyDays !== null && recencyDays >= config.recencyDormantDays) {
    return buildExplain('dormant', 'dormant_recency', compositeScore, recencyDays, aov, subScores);
  }
  if (recencyDays !== null && recencyDays >= config.recencyAtRiskDays) {
    return buildExplain('at_risk', 'at_risk_recency', compositeScore, recencyDays, aov, subScores);
  }

  const isChampion =
    spend >= config.vipLifetimeSpend ||
    (benchmarks.spendP95 != null && spend >= benchmarks.spendP95);

  if (isChampion) {
    return buildExplain('champion', 'vip_spend_or_percentile', compositeScore, recencyDays, aov, subScores);
  }

  const spendFloor = resolveSpendBenchmark(config, benchmarks);
  const visitFloor = resolveVisitBenchmark(config, benchmarks);

  const meetsLoyal =
    spend >= spendFloor &&
    tx >= visitFloor &&
    aov >= config.loyalMinAov &&
    recencyDays !== null &&
    recencyDays <= config.recencyAtRiskDays;

  if (meetsLoyal) {
    return buildExplain('loyal', 'loyal_high_spend_and_visits', compositeScore, recencyDays, aov, subScores);
  }

  if (tx === 1 && spend < config.loyalMinLifetimeSpend) {
    return buildExplain('new', 'single_purchase_insufficient_history', compositeScore, recencyDays, aov, subScores);
  }

  if (spend < spendFloor) {
    return buildExplain('potential', 'potential_lower_spend', compositeScore, recencyDays, aov, subScores);
  }

  if (tx >= config.potentialMinTxCount || spend >= config.loyalMinLifetimeSpend * 0.2) {
    return buildExplain('potential', 'developing_customer', compositeScore, recencyDays, aov, subScores);
  }

  return buildExplain('new', 'insufficient_history', compositeScore, recencyDays, aov, subScores);
}
