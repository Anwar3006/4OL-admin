/**
 * Traditional (non-ML) period-prediction calculator — TASKS.md Epic 17b.
 * Deterministic arithmetic only: cycle-length averaging, a fixed 14-day
 * luteal-phase rule, and a coefficient-of-variation regularity check.
 * Formulas from Period-tracker/PERIODS_TRACKER_ARCHITECTURE.md and
 * ToChange.md's corrected next-period formula (period length only affects
 * bleed duration, never the next start date).
 *
 * Ported in parallel to 4-Our-Life-App/src/features/plasence/calculations.ts
 * for offline mobile estimates — the two implementations are kept in sync by
 * a shared test fixture, not shared runtime code (see period-calculator.test.ts).
 */

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;
const SLIDING_WINDOW_SIZE = 3;

export type CycleInput = {
  period_start_date: string; // YYYY-MM-DD
  period_length?: number | null;
};

export type Regularity =
  | "regular"
  | "slightly_variable"
  | "moderately_irregular"
  | "highly_irregular"
  | "insufficient_data";

export type CycleStatistics = {
  averageCycleLength: number;
  minCycleLength: number | null;
  maxCycleLength: number | null;
  stdDeviation: number | null;
  coefficientOfVariation: number | null;
  cycleCount: number;
  regularity: Regularity;
};

export type OvulationEvidence = "estimated" | "opk_detected" | "insufficient_data";

export type PeriodPrediction = {
  predictedPeriodStart: string;
  predictedPeriodEnd: string;
  predictedOvulationDate: string;
  conservativeOvulationDate: string | null;
  fertileWindowStart: string;
  fertileWindowEnd: string;
  confidence: number;
  ovulationEvidence: OvulationEvidence;
  modelKey: "traditional-v1";
};

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Sample standard deviation (n-1 denominator) — undefined for fewer than 2 values. */
function sampleStdDeviation(values: number[]): number | null {
  if (values.length < 2) return null;
  const average = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function classifyRegularity(coefficientOfVariation: number | null): Regularity {
  if (coefficientOfVariation == null) return "insufficient_data";
  if (coefficientOfVariation < 0.08) return "regular";
  if (coefficientOfVariation < 0.15) return "slightly_variable";
  if (coefficientOfVariation < 0.25) return "moderately_irregular";
  return "highly_irregular";
}

/** Gaps (in days) between consecutive confirmed period start dates, oldest to newest. */
function cycleLengthsFromHistory(cycles: CycleInput[]): number[] {
  const sorted = [...cycles].sort((a, b) => a.period_start_date.localeCompare(b.period_start_date));
  const lengths: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    lengths.push(daysBetween(parseIsoDate(sorted[i - 1].period_start_date), parseIsoDate(sorted[i].period_start_date)));
  }
  return lengths;
}

/**
 * Sliding-window (last 3 cycles) statistics. Falls back to
 * DEFAULT_CYCLE_LENGTH with fewer than 2 recorded cycles (no gap to measure
 * yet) rather than guessing from a single data point.
 */
export function calculateCycleStatistics(cycles: CycleInput[]): CycleStatistics {
  const allLengths = cycleLengthsFromHistory(cycles);
  const windowed = allLengths.slice(-SLIDING_WINDOW_SIZE);

  if (windowed.length === 0) {
    return {
      averageCycleLength: DEFAULT_CYCLE_LENGTH,
      minCycleLength: null,
      maxCycleLength: null,
      stdDeviation: null,
      coefficientOfVariation: null,
      cycleCount: cycles.length,
      regularity: "insufficient_data",
    };
  }

  const average = mean(windowed);
  const stdDeviation = sampleStdDeviation(windowed);
  const coefficientOfVariation = stdDeviation != null && average > 0 ? stdDeviation / average : null;

  return {
    averageCycleLength: Math.round(average),
    minCycleLength: Math.min(...windowed),
    maxCycleLength: Math.max(...windowed),
    stdDeviation,
    coefficientOfVariation,
    cycleCount: cycles.length,
    regularity: classifyRegularity(coefficientOfVariation),
  };
}

/**
 * Cycle-count factor (min(cycleCount/6, 0.7)) + a regularity factor derived
 * from the coefficient of variation, clamped to [0.25, 0.95]. Deliberately
 * omits a "recent prediction accuracy" factor for v1 — period_forecasts has
 * no error history to bootstrap from until predictions have run at least once.
 */
export function calculateConfidence(cycleCount: number, coefficientOfVariation: number | null): number {
  const cycleCountFactor = Math.min(cycleCount / 6, 0.7);
  const regularityFactor = coefficientOfVariation == null ? 0 : Math.max(0, 0.3 - coefficientOfVariation);
  const raw = cycleCountFactor + regularityFactor;
  return Math.round(Math.min(0.95, Math.max(0.25, raw)) * 100) / 100;
}

/**
 * Predicts the next period, ovulation, and fertile window from the most
 * recent confirmed period start. Next Period Start = Most Recent Period
 * Start + Average Cycle Length (period length only affects bleed duration,
 * never the next start date — the corrected formula from ToChange.md).
 */
/**
 * `opkPositiveNearWindow` is a simple caller-computed flag (a positive/peak
 * period_ovulation_tests result within the estimated fertile window) rather
 * than raw test rows — keeps this module free of DB-shaped input, since it's
 * ported in parallel to mobile. It only changes the reported evidence label
 * in Phase 0, never the predicted date itself (recalculating dates from
 * OPK/BBT/mucus signals is Phase 1).
 */
export function predictNextPeriod(
  cycles: CycleInput[],
  mostRecentPeriodStart: string,
  typicalPeriodLength = DEFAULT_PERIOD_LENGTH,
  opkPositiveNearWindow = false,
): PeriodPrediction {
  const stats = calculateCycleStatistics(cycles);
  const start = parseIsoDate(mostRecentPeriodStart);
  const predictedStart = addDays(start, stats.averageCycleLength);

  const latestPeriodLength = [...cycles]
    .sort((a, b) => b.period_start_date.localeCompare(a.period_start_date))[0]?.period_length;
  const periodLength = latestPeriodLength ?? typicalPeriodLength;
  const predictedEnd = addDays(predictedStart, periodLength - 1);

  const ovulation = addDays(predictedStart, -14);

  let conservativeOvulationDate: string | null = null;
  if ((stats.regularity === "moderately_irregular" || stats.regularity === "highly_irregular") && stats.minCycleLength != null) {
    const conservativeStart = addDays(start, stats.minCycleLength);
    conservativeOvulationDate = toIsoDate(addDays(conservativeStart, -14));
  }

  // ASRM's biological fertile window: six days ending on ovulation. Kept
  // identical to mobile's cycleContext fallback (calculations.ts) — the two
  // previously disagreed (10 days here vs 6 on mobile), which is exactly the
  // "one canonical prediction" bug Phase 0 fixes.
  const fertileWindowStart = addDays(ovulation, -4);
  const fertileWindowEnd = addDays(ovulation, 1);

  const ovulationEvidence: OvulationEvidence =
    stats.cycleCount < 2 ? "insufficient_data" : opkPositiveNearWindow ? "opk_detected" : "estimated";

  return {
    predictedPeriodStart: toIsoDate(predictedStart),
    predictedPeriodEnd: toIsoDate(predictedEnd),
    predictedOvulationDate: toIsoDate(ovulation),
    conservativeOvulationDate,
    fertileWindowStart: toIsoDate(fertileWindowStart),
    fertileWindowEnd: toIsoDate(fertileWindowEnd),
    confidence: calculateConfidence(stats.cycleCount, stats.coefficientOfVariation),
    ovulationEvidence,
    modelKey: "traditional-v1",
  };
}
