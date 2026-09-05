import { describe, expect, it } from "vitest";

import { CEDI, formatCurrency, formatDate } from "@/lib/format";

describe("formatCurrency", () => {
  it("groups thousands", () => {
    expect(formatCurrency(1200)).toBe(`${CEDI}1,200`);
    expect(formatCurrency(1234567)).toBe(`${CEDI}1,234,567`);
  });

  it("caps money at two fraction digits", () => {
    // The defect this replaces: bare toLocaleString() renders 1234.567 as
    // "1,234.567", which is not a currency amount.
    expect(formatCurrency(1234.567)).toBe(`${CEDI}1,234.57`);
  });

  it("does not force decimals on whole cedis by default", () => {
    // Deliberate: the call sites this replaced rendered "₵1,200", and adding
    // ".00" everywhere would be a visible change across every money screen.
    expect(formatCurrency(1200)).toBe(`${CEDI}1,200`);
    expect(formatCurrency(1200, { decimals: 2 })).toBe(`${CEDI}1,200.00`);
  });

  it("accepts numeric strings, because the API returns them", () => {
    expect(formatCurrency("1200.5")).toBe(`${CEDI}1,200.5`);
  });

  it("falls back rather than printing NaN", () => {
    expect(formatCurrency(null)).toBe(`${CEDI}0`);
    expect(formatCurrency(undefined)).toBe(`${CEDI}0`);
    expect(formatCurrency("not a number")).toBe(`${CEDI}0`);
    expect(formatCurrency(Infinity)).toBe(`${CEDI}0`);
    expect(formatCurrency(null, { fallback: "—" })).toBe("—");
  });

  it("keeps zero and negatives distinct from the fallback", () => {
    expect(formatCurrency(0)).toBe(`${CEDI}0`);
    expect(formatCurrency(-250)).toBe(`${CEDI}-250`);
  });

  it("goes compact only above the threshold", () => {
    expect(formatCurrency(9_999, { compact: true })).toBe(`${CEDI}9,999`);
    expect(formatCurrency(12_400, { compact: true })).toBe(`${CEDI}12.4K`);
  });

  it("uses one cedi spelling", () => {
    // The tree rendered both ₵ and GH₵. CEDI is the single source.
    expect(formatCurrency(5).startsWith(CEDI)).toBe(true);
    expect(CEDI).toBe("₵");
  });
});

describe("formatDate", () => {
  it("renders ISO-style YYYY-MM-DD", () => {
    expect(formatDate(new Date(2026, 8, 5))).toBe("2026-09-05");
  });

  it("zero-pads month and day", () => {
    expect(formatDate(new Date(2026, 0, 3))).toBe("2026-01-03");
  });

  it("accepts a string or an epoch, as the old moment helper did", () => {
    expect(formatDate("2026-09-05T12:00:00Z")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(formatDate(new Date(2026, 8, 5).getTime())).toBe("2026-09-05");
  });

  it("falls back instead of rendering 'Invalid Date'", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("")).toBe("—");
    expect(formatDate("banana")).toBe("—");
    expect(formatDate(null, "n/a")).toBe("n/a");
  });
});
