"use client";

import { Activity, CalendarDays, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  BoolRow,
  DetailField,
  DetailIdLine,
  DetailModal,
  DetailSection,
  MaskedNotice,
  fmtDate,
  humanize,
  num,
} from "@/components/detail";
import { useViewPeriodUserDialog } from "@/features/period/data/dialog-hooks";
import type { Row } from "@/features/period/schema/types";

/**
 * Period Tracker ▸ Users & Cycles row detail (Gap: "clicking a user
 * redirects to the main Users menu, which only stores sign-up details").
 * This shows the row's own privacy-minimized cycle/forecast/engagement
 * data — the thing an admin actually needs when they click a tracker here —
 * instead of sending them to features/users, which has no notion of any of
 * this. Opens with the already-fetched row (see dialog-hooks.ts); no
 * separate fetch by id.
 *
 * Rendered on the shared detail-modal shell (components/detail) so it matches
 * the Admins / Reviews / Users / Fitness modals. The masking banner makes the
 * privacy-minimization explicit: the display name is masked upstream and no
 * direct identifiers are ever surfaced here.
 */
export default function ViewPeriodUserDialog() {
  const { isOpen, data: row, close } = useViewPeriodUserDialog<Row>();
  if (!isOpen || !row) return null;

  return (
    <DetailModal
      open={isOpen}
      onClose={close}
      maxWidth="sm:max-w-2xl"
      title={row.user || "Unnamed tracker"}
      badges={
        <Badge variant="outline">
          {humanize(row.source) ?? "User"}
        </Badge>
      }
      idLine={<DetailIdLine id={row.userId} />}
      banner={
        <MaskedNotice message="Privacy-minimized by design: the display name is masked and no direct identifiers (email, phone, NHIS) are exposed. Cycle and forecast data are shown for population-health oversight only." />
      }
    >
      <DetailSection title="Cycle" icon={Heart}>
        <DetailField label="Tracking goal" value={humanize(row.goal)} />
        <DetailField label="Current phase" value={humanize(row.currentPhase)} />
        <DetailField label="Last period" value={fmtDate(row.lastPeriod)} />
        <DetailField
          label="Cycle length"
          value={row.cycleLength ? `${row.cycleLength} days` : null}
        />
        <DetailField
          label="Period length"
          value={row.periodLength ? `${row.periodLength} days` : null}
        />
      </DetailSection>

      <DetailSection title="Forecast" icon={CalendarDays}>
        <DetailField
          label="Next period forecast"
          value={fmtDate(row.nextForecast)}
        />
        <DetailField
          label="Ovulation estimate"
          value={fmtDate(row.ovulationDate)}
        />
        <DetailField label="Fertile window" value={row.fertileWindow} />
      </DetailSection>

      <DetailSection title="Engagement" icon={Activity}>
        <DetailField label="Region" value={row.region} />
        <DetailField label="Daily logs" value={num(row.dailyLogs)} />
        <DetailField
          label="Marketing opt-in"
          value={humanize(row.marketing) ?? "Not Asked"}
        />
        <BoolRow label="Reminders enabled" value={Boolean(row.reminders)} />
      </DetailSection>
    </DetailModal>
  );
}
