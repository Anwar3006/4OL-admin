// Epic 9.1: shared series-color convention for every shadcn-based chart in
// the app. All 6 tokens are defined once in app/globals.css
// (--color-chart-1 .. --color-chart-6) against the existing brand palette,
// so callers never hardcode a hex value per series.
export const CHART_SERIES_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
] as const;

export function chartSeriesColor(index: number): string {
  return CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length];
}
