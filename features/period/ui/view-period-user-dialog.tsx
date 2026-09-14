"use client";

import type { ReactNode } from "react";
import Modal from "@/components/redesign/Modal";
import { useViewPeriodUserDialog } from "@/features/period/data/dialog-hooks";
import type { Row } from "@/features/period/schema/types";
import { consentState, date, goalBadge, reminderBadge, shortId } from "./formatters";

/**
 * Period Tracker ▸ Users & Cycles row detail (Gap: "clicking a user
 * redirects to the main Users menu, which only stores sign-up details").
 * This shows the row's own privacy-minimized cycle/forecast/engagement
 * data — the thing an admin actually needs when they click a tracker here —
 * instead of sending them to features/users, which has no notion of any of
 * this. Opens with the already-fetched row (see dialog-hooks.ts); no
 * separate fetch by id.
 */
export default function ViewPeriodUserDialog() {
  const { isOpen, data: row, close } = useViewPeriodUserDialog<Row>();
  if (!isOpen || !row) return null;

  return (
    <Modal isOpen={isOpen} onClose={close} title="Tracker detail">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {row.user || "Unnamed tracker"}
            </div>
            <div className="mt-1 flex items-center gap-2 text-2xs text-slate-500">
              <code className="text-2xs">{shortId(row.userId)}</code>
              <span>·</span>
              <span>{row.region || "Not supplied"}</span>
            </div>
          </div>
          <span className="badge badge-blue capitalize">
            {String(row.source ?? "user").replaceAll("_", " ")}
          </span>
        </div>

        <Section title="Cycle">
          <Field label="Tracking goal" value={goalBadge(row.goal)} />
          <Field label="Last period" value={date(row.lastPeriod)} />
          <Field label="Current phase" value={row.currentPhase || "Not calculated"} />
          <Field
            label="Cycle length"
            value={row.cycleLength ? `${row.cycleLength} days` : "—"}
          />
          <Field
            label="Period length"
            value={row.periodLength ? `${row.periodLength} days` : "—"}
          />
        </Section>

        <Section title="Forecast">
          <Field label="Next period forecast" value={date(row.nextForecast)} />
          <Field label="Ovulation estimate" value={date(row.ovulationDate)} />
          <Field label="Fertile window" value={row.fertileWindow || "—"} />
        </Section>

        <Section title="Engagement">
          <Field label="Daily logs" value={String(row.dailyLogs ?? 0)} />
          <Field label="Reminders" value={reminderBadge(Boolean(row.reminders))} />
          <Field
            label="Marketing opt-in"
            value={consentState(row.marketing ?? "not_asked")}
          />
        </Section>
      </div>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h4 className="mb-2 text-2xs font-bold uppercase tracking-wider text-slate-400">
        {title}
      </h4>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-2xs text-slate-400">{label}</div>
      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        {value}
      </div>
    </div>
  );
}
