"use client";

/**
 * Density mode hook (Gap Analysis Part X).
 *
 * Mirrors the mockup's ts-density-btn compact toggle for the Tailwind stack:
 *   - persists the user's choice in localStorage ("auto" default),
 *   - "auto" resolves to compact on viewports ≤ 1024px so iPads/tablets
 *     open in compact density dynamically (X-D2),
 *   - applies data-density on <html>, which the globals.css token block
 *     consumes (--row-py, --card-p, --kpi-p, --grid-gap, --control-h).
 */

import { useCallback, useEffect, useState } from "react";

export type DensityMode = "auto" | "comfortable" | "compact";

const STORAGE_KEY = "4ol-admin-density";
const COMPACT_MQ = "(max-width: 1024px)";

function readStoredMode(): DensityMode {
  if (typeof window === "undefined") return "auto";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "comfortable" || stored === "compact" ? stored : "auto";
}

export function useDensity() {
  const [mode, setModeState] = useState<DensityMode>("auto");
  const [isTablet, setIsTablet] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setModeState(readStoredMode());
    setHydrated(true);

    const mq = window.matchMedia(COMPACT_MQ);
    setIsTablet(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsTablet(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const effective: "comfortable" | "compact" =
    mode === "auto" ? (isTablet ? "compact" : "comfortable") : mode;

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.density = effective;
  }, [effective, hydrated]);

  const setMode = useCallback((next: DensityMode) => {
    setModeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  /** Cycles auto → comfortable → compact → auto (header toggle button). */
  const cycleMode = useCallback(() => {
    setModeState((prev) => {
      const next: DensityMode =
        prev === "auto" ? "comfortable" : prev === "comfortable" ? "compact" : "auto";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { mode, effective, hydrated, setMode, cycleMode };
}
