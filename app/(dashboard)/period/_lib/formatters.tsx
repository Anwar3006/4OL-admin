import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";

import type { Row } from "./types";

/**
 * Cell formatters shared by the tab tables. Extracted verbatim from
 * page.tsx — no behaviour change.
 */
export const date = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "—";
export const dateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
export const pct = (value?: number | null) =>
  value == null ? "Not measured" : `${value}%`;
export const shortId = (value?: string) => (value ? `${value.slice(0, 8)}…` : "—");
export const bool = (value: boolean) => (
  <span className={cn("badge", value ? "badge-green" : "badge-blue")}>
    {value ? "Yes" : "No"}
  </span>
);
// Marketing/research consent: distinguishes "never asked" from an actual
// decline -- the mobile app doesn't offer these yet, so every user is
// "not_asked" today, and that's not the same thing as "No".
export const consentState = (value: "granted" | "declined" | "not_asked") => (
  <span
    className={cn(
      "badge",
      value === "granted"
        ? "badge-green"
        : value === "declined"
          ? "badge-blue"
          : "badge-slate",
    )}
  >
    {value === "granted" ? "Yes" : value === "declined" ? "No" : "Not asked"}
  </span>
);
export const status = (value: string, row?: Row) => (
  <span
    className={cn(
      "badge",
      row?.overdue
        ? "badge-red"
        : ["resolved", "published", "active", "synced", "approved"].includes(
              value,
            )
          ? "badge-green"
          : ["urgent", "failed", "rejected", "paused"].includes(value)
            ? "badge-red"
            : "badge-blue",
    )}
  >
    {String(value ?? "unknown").replaceAll("_", " ")}
  </span>
);
