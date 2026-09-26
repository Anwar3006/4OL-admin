"use client";

import Image from "next/image";
import { Activity, CreditCard, Dumbbell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  BoolRow,
  DetailField,
  DetailIdLine,
  DetailModal,
  DetailSection,
  StatusBadge,
  fmtDate,
  humanize,
  list,
  num,
} from "@/components/detail";
import { useViewFitnessUserDialog } from "@/features/fitness/data/dialog-hooks";
import type { FitnessUserRow } from "@/features/fitness/data/useFitnessAnalytics";

/**
 * Fitness ▸ Users row detail (Gap: "clicking a user redirects to the main
 * Users menu, which only stores sign-up details"). Shows the row's own
 * plan/workout/FitCoins/subscription data — the thing an admin actually
 * needs when they click a member here — instead of sending them to
 * features/users, which has no notion of any of this. Opens with the
 * already-fetched FitnessUserRow (see dialog-hooks.ts); no separate fetch.
 *
 * Renders on the shared detail-modal shell (components/detail) so it matches
 * the Admins / Reviews / Users modals, and surfaces every field the RPC
 * returns — including user_id, tier_key and is_premium, which the previous
 * bespoke layout dropped.
 */
export default function ViewFitnessUserDialog() {
  const { isOpen, data: row, close } =
    useViewFitnessUserDialog<FitnessUserRow>();

  if (!isOpen || !row) return null;

  const completion = Math.min(100, Math.max(0, row.plan_completion_pct ?? 0));

  return (
    <DetailModal
      open={isOpen}
      onClose={close}
      maxWidth="sm:max-w-2xl"
      title={row.name || "Unnamed user"}
      avatar={
        row.avatar_url ? (
          <Image
            src={row.avatar_url}
            alt=""
            width={56}
            height={56}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : undefined
      }
      badges={
        <>
          <StatusBadge status={row.status || "active"} />
          <Badge
            variant="outline"
            className={
              row.is_premium
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                : "border-slate-200 bg-slate-100 text-slate-600 dark:bg-slate-800"
            }
          >
            {row.tier_name || "Free"}
          </Badge>
        </>
      }
      idLine={<DetailIdLine id={row.user_id} />}
    >
      <DetailSection title="Subscription" icon={CreditCard}>
        <DetailField label="Tier" value={row.tier_name || "Free"} />
        <DetailField label="Tier key" value={row.tier_key} mono />
        <DetailField
          label="Source"
          value={humanize(row.subscription_source)}
        />
        <DetailField
          label="Expires"
          value={
            row.is_premium
              ? row.subscription_expires_at
                ? fmtDate(row.subscription_expires_at)
                : "Lifetime"
              : null
          }
        />
        <BoolRow label="Premium member" value={row.is_premium} />
      </DetailSection>

      <DetailSection title="Training" icon={Dumbbell}>
        <DetailField label="Experience level" value={humanize(row.level)} />
        <DetailField label="Body type" value={humanize(row.body_type)} />
        <DetailField label="Goals" value={list(row.fitness_goals)} />
        <DetailField label="Current plan" value={humanize(row.plan)} />
        <DetailField label="Plan completion" value={`${completion}%`} />
      </DetailSection>

      <DetailSection title="Activity" icon={Activity}>
        <DetailField label="Workouts logged" value={num(row.workouts)} />
        <DetailField label="Calories burned" value={num(row.kcal)} />
        <DetailField label="FitCoins" value={num(row.fitcoins)} />
        <DetailField label="AI calls" value={num(row.ai_calls)} />
        <DetailField label="Joined" value={fmtDate(row.joined_at)} />
        <DetailField label="Last active" value={fmtDate(row.last_active)} />
      </DetailSection>
    </DetailModal>
  );
}
