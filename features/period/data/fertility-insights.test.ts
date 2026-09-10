import { expect, test } from "vitest";
import { detectBbtShift } from "./fertility-insights";

test("detectBbtShift needs at least 6 readings", () => {
  expect(detectBbtShift([36.5, 36.6, 36.5, 36.9, 37.0])).toBeNull();
});

test("detectBbtShift returns null when the shift is under the 0.2°C threshold", () => {
  expect(detectBbtShift([36.5, 36.5, 36.5, 36.6, 36.6, 36.6])).toBeNull();
});

test("detectBbtShift returns the shift when recent readings rise >=0.2°C over the prior three", () => {
  const shift = detectBbtShift([36.4, 36.5, 36.4, 36.7, 36.8, 36.7]);
  expect(shift).not.toBeNull();
  expect(shift!).toBeCloseTo(0.3, 5);
});
