import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CYCLE_LENGTH,
  calculateCycleStatistics,
  calculateConfidence,
  predictNextPeriod,
} from "./period-calculator";

test("cold start (fewer than 2 cycles) falls back to DEFAULT_CYCLE_LENGTH", () => {
  const stats = calculateCycleStatistics([{ period_start_date: "2026-01-01" }]);
  assert.equal(stats.averageCycleLength, DEFAULT_CYCLE_LENGTH);
  assert.equal(stats.regularity, "insufficient_data");
  assert.equal(stats.stdDeviation, null);
});

test("regular cycles (identical 28-day gaps) classify as regular with zero deviation", () => {
  const cycles = [
    { period_start_date: "2026-01-01" },
    { period_start_date: "2026-01-29" },
    { period_start_date: "2026-02-26" },
  ];
  const stats = calculateCycleStatistics(cycles);
  assert.equal(stats.averageCycleLength, 28);
  assert.equal(stats.stdDeviation, 0);
  assert.equal(stats.coefficientOfVariation, 0);
  assert.equal(stats.regularity, "regular");
});

test("cycle averaging: next period start = most recent start + average cycle length", () => {
  const cycles = [
    { period_start_date: "2026-01-01" },
    { period_start_date: "2026-01-29" }, // 28-day gap
    { period_start_date: "2026-02-26" }, // 28-day gap
  ];
  const prediction = predictNextPeriod(cycles, "2026-02-26", 5);
  // 2026-02-26 + 28 days = 2026-03-26
  assert.equal(prediction.predictedPeriodStart, "2026-03-26");
  // ovulation = predicted start - 14 days = 2026-03-12
  assert.equal(prediction.predictedOvulationDate, "2026-03-12");
  // fertile window = ovulation -7 / +2
  assert.equal(prediction.fertileWindowStart, "2026-03-05");
  assert.equal(prediction.fertileWindowEnd, "2026-03-14");
  // period length falls back to the passed typical length (5) since no
  // recorded cycle has a period_length
  assert.equal(prediction.predictedPeriodEnd, "2026-03-30");
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
  assert.equal(spanDays, 5); // 6-day period = start + 5
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
  assert.equal(stats.regularity, "moderately_irregular");
  assert.equal(stats.minCycleLength, 24);

  const prediction = predictNextPeriod(cycles, "2026-03-24");
  assert.notEqual(prediction.conservativeOvulationDate, null);
  // conservative estimate must be earlier than (or equal to) the point
  // estimate, since it uses the shortest recorded cycle
  assert.ok(
    new Date(prediction.conservativeOvulationDate!).getTime() <=
      new Date(prediction.predictedOvulationDate).getTime(),
  );
});

test("confidence is always clamped to [0.25, 0.95]", () => {
  assert.equal(calculateConfidence(0, null), 0.25);
  assert.equal(calculateConfidence(1, null), Math.max(0.25, 1 / 6));
  assert.ok(calculateConfidence(20, 0) <= 0.95);
  assert.ok(calculateConfidence(20, 0) >= 0.25);
});

test("more confirmed cycles and lower variation increase confidence", () => {
  const lowData = calculateConfidence(1, 0.2);
  const highData = calculateConfidence(6, 0.05);
  assert.ok(highData > lowData);
});
