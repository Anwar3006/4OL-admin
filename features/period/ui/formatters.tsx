import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

import type { Row } from "@/features/period/schema/types";

/**
 * Cell formatters shared by the tab tables. Badge classes (.b + color
 * modifier) and .id-badge come from components/mockup-theme/mockup-theme.css,
 * a scoped port of admin-panel.html's own CSS -- see that file's header
 * comment for why it's scoped rather than global.
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
export const shortId = (value?: string) =>
  value ? `${value.slice(0, 8)}…` : "—";

/** Short/masked ID rendered as the mockup's monospace indigo pill. */
export const idBadge = (value?: string) =>
  value ? (
    <span className="id-badge text-xs 2xl:text-sm">{shortId(value)}</span>
  ) : (
    "—"
  );

// Yes/No booleans: mockup renders every false as gold (.by), not blue --
// see e.g. the Consent tab's Tracking/Notifications columns
// (admin-panel.html:6205-6207).
export const bool = (value: boolean) => (
  <span className={cn("b", value ? "bg" : "by")}>{value ? "Yes" : "No"}</span>
);
// Marketing/research consent: distinguishes "never asked" from an actual
// decline -- the mobile app doesn't offer these yet, so every user is
// "not_asked" today, and that's not the same thing as "No". Colors match
// admin-panel.html:6141-6143/6205-6207 exactly: granted=.bg, declined=.by
// (gold, same as any other false), not_asked=.bmu (the mockup's own
// hard-coded #F1F5F9/#64748B chip, given a class here so dark mode works).
export const consentState = (value: "granted" | "declined" | "not_asked") => (
  <span
    className={cn(
      "b",
      value === "granted" ? "bg" : value === "declined" ? "by" : "bmu",
    )}
  >
    {value === "granted" ? "Yes" : value === "declined" ? "No" : "Not asked"}
  </span>
);

/** Secondary 11px text (region, etc.) -- admin-panel.html styles these
 * cells `font-size:11px` inline throughout, without changing color. */
export const smallText = (value?: string | null) => (
  <span className="text-xs 2xl:text-sm">{value || "—"}</span>
);

/** The mockup's recurring "no data" idiom: an em dash in --mu. */
const mutedDash = () => <span style={{ color: "var(--mu)" }}>—</span>;

const GOAL_META: Record<
  string,
  { icon: string; label: string; className?: string; style?: CSSProperties }
> = {
  track_period: { icon: "🌸", label: "Track", className: "b bt" },
  trying_to_conceive: {
    icon: "🤰",
    label: "TTC",
    className: "b",
    style: { background: "var(--pinkm)", color: "#9D174D" },
  },
  pcos_support: { icon: "💊", label: "PCOS", className: "b bbl" },
  pregnancy: { icon: "👶", label: "Pregnancy", className: "b bpu" },
};
/** Onboarding tracking goal (period_user_settings.tracking_goal), styled
 * per admin-panel.html:6141-6143's Goal column. */
export const goalBadge = (value?: string | null) => {
  const meta = (value && GOAL_META[value]) || {
    icon: "🌸",
    label: value?.replaceAll("_", " ") || "—",
    className: "b bdk",
  };
  return (
    <span className={meta.className} style={meta.style}>
      {meta.icon} {meta.label}
    </span>
  );
};

/** period_user_settings.reminders_enabled, styled per
 * admin-panel.html:6141-6143's Reminders column. */
export const reminderBadge = (value: boolean) => (
  <span className={cn("b", value ? "bg" : "by")}>
    {value ? "🔔 On" : "🔕 Off"}
  </span>
);

/** Cycle/period length cells: blue+bold when inside the normal range the
 * mockup's own overview cards state (21-35 days cycle, 3-7 days period),
 * red+bold+warning outside it. admin-panel.html:6141-6143. */
export const cycleLength = (value?: number | null) => {
  if (value == null) return "—";
  const abnormal = value < 21 || value > 35;
  return (
    <span
      style={{
        fontWeight: 700,
        color: abnormal ? "var(--red)" : "var(--blue)",
      }}
      className="text-xs 3xl:text-sm"
    >
      {value} days{abnormal ? " ⚠️" : ""}
    </span>
  );
};
export const periodLength = (value?: number | null) => {
  if (value == null) return "—";
  const abnormal = value < 3 || value > 7;
  if (!abnormal)
    return <span className="text-xs 3xl:text-sm">{value} days </span>;
  return (
    <span
      style={{ fontWeight: 700, color: "var(--red)" }}
      className="text-xs 3xl:text-sm"
    >
      {value} days ⚠️
    </span>
  );
};
/** Forecast date, always red+bold in the mockup regardless of value. */
export const forecastDate = (value?: string | null) => (
  <span
    style={{ fontWeight: 700, color: "var(--red)" }}
    className="text-xs 3xl:text-sm"
  >
    {date(value)}
  </span>
);
/** Ovulation estimate / fertile window: 11px purple text, always. */
export const purpleText = (value?: string | null) => (
  <span style={{ color: "var(--purp)" }} className="text-xs 3xl:text-sm">
    {value || "—"}
  </span>
);

/** Daily Logs Flow column: Heavy is called out red+bold, everything else
 * (including "not logged") is plain. admin-panel.html:6155-6157. */
export const flow = (value?: string | null) => {
  if (!value || value === "none")
    return <span className="text-xs 3xl:text-sm">Not logged</span>;
  const label = value.charAt(0).toUpperCase() + value.slice(1);
  if (value === "heavy") {
    return (
      <span
        style={{ color: "var(--red)", fontWeight: 700 }}
        className="text-xs 3xl:text-sm"
      >
        {label}
      </span>
    );
  }
  return <span className="text-xs 3xl:text-sm">{label}</span>;
};

/** Each logged symptom as text + a severity/5 chip -- red at 3+, gold
 * below. admin-panel.html:6155-6157 ("Cramps 2/5", "Back pain 3/5"). */
export const symptomsList = (value?: unknown) => {
  const items = Array.isArray(value) ? value : [];
  if (!items.length) return "—";
  return (
    <span style={{ fontSize: 11 }}>
      {items.map((item, index) => {
        const name =
          typeof item === "string" ? item : (item as { name?: string })?.name;
        const severity =
          typeof item === "object"
            ? (item as { severity?: number })?.severity
            : undefined;
        if (!name) return null;
        return (
          <span key={`${name}-${index}`}>
            {index > 0 && ", "}
            {name}
            {severity != null && (
              <span
                className={cn("b", severity >= 3 ? "br" : "by")}
                style={{ fontSize: 9, marginLeft: 3 }}
              >
                {severity}/5
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
};

/** BBT: value with the user's own unit, or a muted dash. */
export const bbt = (value?: number | null, unit?: string | null) =>
  value == null ? (
    mutedDash()
  ) : (
    <span className="text-xs 3xl:text-sm">
      {value}°{(unit ?? "c").toUpperCase()}
    </span>
  );

/** Cervical mucus: 11px, title-cased, or a muted dash. */
export const cervicalMucus = (value?: string | null) =>
  value ? (
    <span style={{ fontSize: 11 }}>{value.replaceAll("_", " ")}</span>
  ) : (
    mutedDash()
  );

/** Exercise minutes: logged 0 is real data and stays plain; missing is a
 * muted dash -- admin-panel.html:6155-6157 shows both in the same tab. */
export const exerciseMinutes = (value?: number | null) =>
  value == null ? (
    mutedDash()
  ) : (
    <span className="text-xs 3xl:text-sm">{value} min</span>
  );

/** Medication: name as a green pill when logged, muted dash otherwise. */
export const medication = (logged?: boolean, name?: string | null) =>
  logged && name ? <span className="b bg">💊 {name}</span> : mutedDash();

// period_daily_logs.source is one of: user, admin, migration, device,
// offline_sync. offline_sync reads as the mockup's "Offline" (.by); every
// other source is a normal in-app entry (.bbl), matching the mockup's
// App=.bbl / Offline=.by split (admin-panel.html:6155-6157).
export const sourceBadge = (value?: string | null) => (
  <span className={cn("b", value === "offline_sync" ? "by" : "bbl")}>
    {(value ?? "user").replaceAll("_", " ")}
  </span>
);

const SYNC_META: Record<string, { icon: string; className: string }> = {
  synced: { icon: "✅", className: "bg" },
  queued: { icon: "⏳", className: "by" },
  local: { icon: "⏳", className: "by" },
  conflict: { icon: "⚠️", className: "br" },
  failed: { icon: "❌", className: "br" },
};
/** period_daily_logs.sync_status, styled + emoji-prefixed per
 * admin-panel.html:6155-6157's Sync column. */
export const syncStatus = (value: string) => {
  const meta = SYNC_META[value] ?? { icon: "•", className: "bbl" };
  return (
    <span className={cn("b", meta.className)}>
      {meta.icon} {value}
    </span>
  );
};

const RESOLVED_STATES = [
  "resolved",
  "published",
  "active",
  "synced",
  "approved",
  "completed",
];
const FAILED_STATES = ["urgent", "failed", "rejected", "paused"];
const PENDING_STATES = [
  "pending",
  "in_review",
  "review",
  "queued",
  "scheduled",
  "draft",
];

export const status = (value: string, row?: Row) => {
  const badgeClass = row?.overdue
    ? "br"
    : RESOLVED_STATES.includes(value)
      ? "bg"
      : FAILED_STATES.includes(value)
        ? "br"
        : PENDING_STATES.includes(value)
          ? "by"
          : "bbl";
  return (
    <span className={cn("b", badgeClass)}>
      {String(value ?? "unknown").replaceAll("_", " ")}
    </span>
  );
};

/** A column with no real backing yet -- nothing in the mobile app or the
 * backend ever writes the field this would be computed from, so showing a
 * number (even "0%") would read as a real measurement when it isn't one.
 * Used by the Engagement tab's Open Rate / Action Rate columns: campaigns
 * are genuinely created and dispatched (period_campaigns, real audience
 * resolution, real notifications insert), but nothing logs an open or an
 * in-app action back — period_notification_events stays empty and
 * period_campaigns.opened_count/action_count are never incremented. */
export const notTracked = (reason: string) => (
  <span
    className="inline-flex items-center gap-1 text-2xs italic text-slate-400 dark:text-slate-500"
    title={reason}
  >
    ℹ️ Not tracked
  </span>
);
