import { expect, test } from "vitest";
import {
  DEFAULT_CYCLE_LENGTH,
  calculateCycleStatistics,
  calculateConfidence,
  predictNextPeriod,
} from "./period-calculator";

test("cold start (fewer than 2 cycles) falls back to DEFAULT_CYCLE_LENGTH", () => {
  const stats = calculateCycleStatistics([{ period_start_date: "2026-01-01" }]);
  expect(stats.averageCycleLength).toBe(DEFAULT_CYCLE_LENGTH);
  expect(stats.regularity).toBe("insufficient_data");
  expect(stats.stdDeviation).toBeNull();
});

test("regular cycles (identical 28-day gaps) classify as regular with zero deviation", () => {
  const cycles = [
    { period_start_date: "2026-01-01" },
    { period_start_date: "2026-01-29" },
    { period_start_date: "2026-02-26" },
  ];
  const stats = calculateCycleStatistics(cycles);
  expect(stats.averageCycleLength).toBe(28);
  expect(stats.stdDeviation).toBe(0);
  expect(stats.coefficientOfVariation).toBe(0);
  expect(stats.regularity).toBe("regular");
});

test("cycle averaging: next period start = most recent start + average cycle length", () => {
  const cycles = [
    { period_start_date: "2026-01-01" },
    { period_start_date: "2026-01-29" }, // 28-day gap
    { period_start_date: "2026-02-26" }, // 28-day gap
  ];
  const prediction = predictNextPeriod(cycles, "2026-02-26", 5);
  // 2026-02-26 + 28 days = 2026-03-26
  expect(prediction.predictedPeriodStart).toBe("2026-03-26");
  // ovulation = predicted start - 14 days = 2026-03-12
  expect(prediction.predictedOvulationDate).toBe("2026-03-12");
  // fertile window = ovulation -4 / +1 (ASRM's 6-day biological window —
  // Phase 0 trust repair converged this with mobile's cycleContext, which
  // already used -4/+1; this module previously used -7/+2)
  expect(prediction.fertileWindowStart).toBe("2026-03-08");
  expect(prediction.fertileWindowEnd).toBe("2026-03-13");
  // period length falls back to the passed typical length (5) since no
  // recorded cycle has a period_length
  expect(prediction.predictedPeriodEnd).toBe("2026-03-30");
  // 3 regular cycles logged, no OPK signal passed -> a plain estimate
  expect(prediction.ovulationEvidence).toBe("estimated");
});

test("ovulationEvidence reflects insufficient data and OPK detection", () => {
  const oneCycle = [{ period_start_date: "2026-01-01" }];
  expect(predictNextPeriod(oneCycle, "2026-01-01", 5).ovulationEvidence).toBe(
    "insufficient_data",
  );

  const twoCycles = [
    { period_start_date: "2026-01-01" },
    { period_start_date: "2026-01-29" },
  ];
  expect(predictNextPeriod(twoCycles, "2026-01-29", 5).ovulationEvidence).toBe(
    "estimated",
  );
  expect(
    predictNextPeriod(twoCycles, "2026-01-29", 5, true).ovulationEvidence,
  ).toBe("opk_detected");
});

test("date-range calculation: predicted end = predicted start + period length - 1", () => {
  const cycles = [
    { period_start_date: "2026-01-01", period_length: 6 },
    { period_start_date: "2026-01-29", period_length: 6 },
  ];
  const prediction = predictNextPeriod(cycles, "2026-01-29");
  const start = new Date(prediction.predictedPeriodStart);
  const end = new Date(prediction.predictedPeriodEnd);
  const spanDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  expect(spanDays).toBe(5); // 6-day period = start + 5
});

test("irregular cycle: coefficient of variation buckets and conservative estimate", () => {
  // gaps: 24, 32, 26 -> mean 27.33, sample stdDev ~4.16, cv ~0.152 (moderately_irregular)
  const cycles = [
    { period_start_date: "2026-01-01" },
    { period_start_date: "2026-01-25" }, // +24
    { period_start_date: "2026-02-26" }, // +32
    { period_start_date: "2026-03-24" }, // +26
  ];
  const stats = calculateCycleStatistics(cycles);
  expect(stats.regularity).toBe("moderately_irregular");
  expect(stats.minCycleLength).toBe(24);

  const prediction = predictNextPeriod(cycles, "2026-03-24");
  expect(prediction.conservativeOvulationDate).not.toBeNull();
  // conservative estimate must be earlier than (or equal to) the point
  // estimate, since it uses the shortest recorded cycle
  expect(
    new Date(prediction.conservativeOvulationDate!).getTime(),
  ).toBeLessThanOrEqual(new Date(prediction.predictedOvulationDate).getTime());
});

test("confidence is always clamped to [0.25, 0.95]", () => {
  expect(calculateConfidence(0, null)).toBe(0.25);
  expect(calculateConfidence(1, null)).toBe(Math.max(0.25, 1 / 6));
  expect(calculateConfidence(20, 0)).toBeLessThanOrEqual(0.95);
  expect(calculateConfidence(20, 0)).toBeGreaterThanOrEqual(0.25);
});

test("more confirmed cycles and lower variation increase confidence", () => {
  const lowData = calculateConfidence(1, 0.2);
  const highData = calculateConfidence(6, 0.05);
  expect(highData).toBeGreaterThan(lowData);
});
