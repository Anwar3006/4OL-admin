import React from "react";
import { cn } from "@/lib/utils";

/**
 * The single sanctioned KPI-row container (Gap Analysis Part S, S-D1).
 * Three responsive ladders replace the 23 ad-hoc grid variants:
 *   default → 1 / 2 / 4 columns
 *   wide    → 1 / 2 / 3 columns (cards with charts or long values)
 *   six     → 1 / 2 / 6 columns (compact KPI strips)
 * All children stretch to equal heights — no oversized cards.
 */
export type KpiGridVariant = "default" | "wide" | "six";

const LADDERS: Record<KpiGridVariant, string> = {
  default: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  wide: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  six: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-6",
};

export default function KpiGrid({
  variant = "default",
  className,
  children,
}: {
  variant?: KpiGridVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid items-stretch gap-4", LADDERS[variant], className)}>
      {children}
    </div>
  );
}
