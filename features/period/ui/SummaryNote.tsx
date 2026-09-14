"use client";

import React from "react";
import { cn } from "@/lib/utils";

export default function SummaryNote({
  icon,
  text,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  text: string;
  /** "info" flags a data-gap disclosure (e.g. a metric nothing writes to
   * yet) rather than a routine status summary. */
  tone?: "neutral" | "info";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border p-3 text-xs",
        tone === "info"
          ? "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300",
      )}
    >
      {icon}
      <span>{text}</span>
    </div>
  );
}
