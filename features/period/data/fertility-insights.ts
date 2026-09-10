// Fertility insights generator (gap-closure G6).
//
// Rule-based, server-side insight cards derived from the user's own tracker
// data. Every summary is deliberately educational and conservative — the
// medical guardrails apply: we never infer pregnancy, never diagnose, and
// always hedge with "likely / estimated / may". Each card carries an
// evidence map (aggregate metadata only) and a safety level so the app and
// the admin analytics tab can treat them uniformly.

export interface InsightDraft {
  insight_type: "fertile_window" | "ovulation_prediction" | "timing_suggestion" | "bbt_shift" | "irregular_cycle" | "preconception_next_step";
  insight_date: string; // YYYY-MM-DD
  title: string;
  message: string;
  confidence: number; // 0..1
  evidence: Record<string, string | number | boolean | null>;
  /** Table check constraint: informational | caution. */
  safety_level: "informational" | "caution";
}

interface GeneratorInput {
  today: string; // YYYY-MM-DD
  trackingGoal: string | null;
  cycles: Array<{ cycle_length?: number | null; fertile_window?: string | null; ovulation_forecast?: string | null }>;
  forecasts: Array<{ id: string; predicted_ovulation_date?: string | null; fertile_window?: string | null; confidence?: number | null }>;
  dailyLogs: Array<{ logged_on: string; basal_body_temperature?: number | null }>;
  ovulationTests: Array<{ logged_on: string; result?: string }>;
  checklistItems: Array<{ id: string; title?: string }>;
  checklistProgress: Array<{ checklist_item_id: string; status?: string }>;
}

function parseWindow(fertileWindow: string | null | undefined): [string, string] | null {
  // Stored as Postgres range text, e.g. "[2026-09-01,2026-09-06]"
  if (!fertileWindow) return null;
  const match = fertileWindow.match(/[\[\(](\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})[\]\)]/);
  return match ? [match[1], match[2]] : null;
}

/**
 * Sustained BBT rise: mean of the 3 most recent readings vs the 3 before,
 * >=0.2°C. Shared between the insight card above and predictNextPeriod's
 * ovulationEvidence ('bbt_pattern') — same threshold, one place it's
 * defined. Returns the shift in °C, or null if there isn't one /
 * insufficient readings (fewer than 6).
 */
export function detectBbtShift(sortedTemps: number[]): number | null {
  if (sortedTemps.length < 6) return null;
  const recent = sortedTemps.slice(-3);
  const prior = sortedTemps.slice(-6, -3);
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const shift = mean(recent) - mean(prior);
  return shift >= 0.2 ? shift : null;
}

function formatDate(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function generateFertilityInsights(input: GeneratorInput): InsightDraft[] {
  const drafts: InsightDraft[] = [];
  const { today } = input;
  const latestForecast = input.forecasts[0];

  // 1) Estimated fertile window (from the active forecast).
  const window = parseWindow(latestForecast?.fertile_window);
  if (window && window[1] >= today) {
    drafts.push({
      insight_type: "fertile_window",
      insight_date: today,
      title: "Estimated fertile window",
      message: `Your estimated fertile window is ${formatDate(window[0])}–${formatDate(window[1])}, based on your recent cycles. This is an estimate, not a guarantee.`,
      confidence: latestForecast?.confidence ?? 0.5,
      evidence: { forecastId: latestForecast?.id ?? null, windowStart: window[0], windowEnd: window[1] },
      safety_level: "informational",
    });

    // 2) Ovulation estimate — only while the date is upcoming.
    const ovulationDate = latestForecast?.predicted_ovulation_date;
    if (ovulationDate && ovulationDate >= today) {
      drafts.push({
        insight_type: "ovulation_prediction",
        insight_date: today,
        title: "Ovulation estimate",
        message: `Ovulation may occur around ${formatDate(ovulationDate)}. Estimates shift as new cycles are confirmed.`,
        confidence: latestForecast?.confidence ?? 0.5,
        evidence: { forecastId: latestForecast?.id ?? null, predictedOvulationDate: ovulationDate },
        safety_level: "informational",
      });

      // 3) Timing suggestion — TTC goal only, within the next five days.
      const daysAway = Math.round((new Date(`${ovulationDate}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000);
      if (input.trackingGoal === "trying_to_conceive" && daysAway >= 0 && daysAway <= 5) {
        drafts.push({
          insight_type: "timing_suggestion",
          insight_date: today,
          title: "Timing suggestion",
          message: `Your estimated ovulation is about ${daysAway === 0 ? "today" : `${daysAway} day${daysAway === 1 ? "" : "s"} away`}. Many couples choose to have intercourse in the days leading up to it — regular timing often matters more than exact dates.`,
          confidence: (latestForecast?.confidence ?? 0.5) * 0.9,
          evidence: { daysAway, windowStart: window[0], windowEnd: window[1] },
          safety_level: "informational",
        });
      }
    }
  }

  // 4) Basal body temperature shift — three recent readings vs the three before.
  const temps = input.dailyLogs
    .filter((log) => typeof log.basal_body_temperature === "number")
    .sort((a, b) => (a.logged_on < b.logged_on ? -1 : 1))
    .map((log) => log.basal_body_temperature as number);
  const bbtShift = detectBbtShift(temps);
  if (bbtShift != null) {
    drafts.push({
      insight_type: "bbt_shift",
      insight_date: today,
      title: "Temperature shift noted",
      message: `Your recent temperature readings may show a slight upward shift (about ${bbtShift.toFixed(1)}°C). Temperature shifts can follow ovulation, but a single pattern is not a diagnosis.`,
      confidence: 0.45,
      evidence: { sampleCount: temps.length, shiftCelsius: Number(bbtShift.toFixed(2)) },
      safety_level: "informational",
    });
  }

  // 5) Cycle variability — informational, never diagnostic.
  const lengths = input.cycles.map((cycle) => cycle.cycle_length).filter((length): length is number => typeof length === "number" && length > 0);
  if (lengths.length >= 3) {
    const spread = Math.max(...lengths) - Math.min(...lengths);
    if (spread > 8) {
      drafts.push({
        insight_type: "irregular_cycle",
        insight_date: today,
        title: "Cycle length variation",
        message: `Your recent cycles have varied by about ${spread} days. Some variation is common; if it persists or concerns you, a healthcare professional can help you review it. Consider mentioning it at your next check-up.`,
        confidence: 0.6,
        evidence: { cycleCount: lengths.length, spreadDays: spread },
        safety_level: "caution",
      });
    }
  }

  // 6) Preconception next step — TTC users with an unfinished checklist.
  if (input.trackingGoal === "trying_to_conceive" && input.checklistItems.length > 0) {
    const done = new Set(input.checklistProgress.filter((row) => row.status === "done").map((row) => row.checklist_item_id));
    const remaining = input.checklistItems.filter((item) => !done.has(item.id));
    if (remaining.length > 0 && remaining.length < input.checklistItems.length) {
      drafts.push({
        insight_type: "preconception_next_step",
        insight_date: today,
        title: "Your next preconception step",
        message: `You have completed ${done.size} of ${input.checklistItems.length} preconception steps. "${remaining[0].title ?? "The next item"}" may be a good next step.`,
        confidence: 0.8,
        evidence: { completedCount: done.size, totalItems: input.checklistItems.length, nextItemId: remaining[0].id },
        safety_level: "informational",
      });
    }
  }

  return drafts;
}
