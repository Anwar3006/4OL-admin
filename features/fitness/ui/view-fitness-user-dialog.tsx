"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useViewFitnessUserDialog } from "@/features/fitness/data/dialog-hooks";
import type { FitnessUserRow } from "@/features/fitness/data/useFitnessAnalytics";

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString() : "—";

/**
 * Fitness ▸ Users row detail (Gap: "clicking a user redirects to the main
 * Users menu, which only stores sign-up details"). Shows the row's own
 * plan/workout/FitCoins/subscription data — the thing an admin actually
 * needs when they click a member here — instead of sending them to
 * features/users, which has no notion of any of this. Opens with the
 * already-fetched FitnessUserRow (see dialog-hooks.ts); no separate fetch.
 */
export default function ViewFitnessUserDialog() {
  const { isOpen, data: row, close } = useViewFitnessUserDialog<FitnessUserRow>();
  if (!row) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-lg 3xl:max-w-2xl 4xl:max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 3xl:p-7 border-b bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-4 3xl:gap-5">
            <div className="h-12 w-12 3xl:h-14 3xl:w-14 4xl:h-16 4xl:w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg 3xl:text-xl 4xl:text-2xl font-bold text-slate-400 overflow-hidden shrink-0">
              {row.avatar_url ? (
                <Image
                  src={row.avatar_url}
                  alt=""
                  width={48}
                  height={48}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              ) : (
                (row.name || "U").charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg 3xl:text-xl 4xl:text-2xl font-bold truncate">
                {row.name || "Unnamed user"}
              </DialogTitle>
              <div className="text-2xs 3xl:text-xs 4xl:text-sm text-muted-foreground mt-0.5">
                Joined {formatDate(row.joined_at)}
              </div>
            </div>
            <Badge
              className={
                (row.is_premium
                  ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-200") +
                " 3xl:text-xs 3xl:px-3 3xl:py-1 4xl:text-sm"
              }
            >
              {row.tier_name || "Free"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-6 3xl:p-7 space-y-5 3xl:space-y-6">
          <section>
            <h4 className="text-2xs 3xl:text-xs 4xl:text-sm font-black uppercase tracking-widest text-slate-400 mb-3 3xl:mb-4">
              Subscription
            </h4>
            <div className="grid grid-cols-2 gap-4 3xl:gap-5">
              <Field
                label="Expires"
                value={
                  row.is_premium
                    ? row.subscription_expires_at
                      ? formatDate(row.subscription_expires_at)
                      : "Lifetime"
                    : "—"
                }
              />
              <Field label="Source" value={row.subscription_source || "—"} />
            </div>
          </section>

          <Separator />

          <section>
            <h4 className="text-2xs 3xl:text-xs 4xl:text-sm font-black uppercase tracking-widest text-slate-400 mb-3 3xl:mb-4">
              Training
            </h4>
            <div className="grid grid-cols-2 gap-4 3xl:gap-5">
              <Field label="Experience" value={row.level || "—"} />
              <Field label="Body type" value={row.body_type || "—"} />
              <Field
                label="Goals"
                value={row.fitness_goals?.length ? row.fitness_goals.join(", ") : "—"}
              />
              <Field label="Current plan" value={row.plan || "—"} />
              <Field
                label="Plan completion"
                value={`${Math.min(100, Math.max(0, row.plan_completion_pct ?? 0))}%`}
              />
              <Field label="Last active" value={formatDate(row.last_active)} />
            </div>
          </section>

          <Separator />

          <section>
            <h4 className="text-2xs 3xl:text-xs 4xl:text-sm font-black uppercase tracking-widest text-slate-400 mb-3 3xl:mb-4">
              Activity
            </h4>
            <div className="grid grid-cols-2 gap-4 3xl:gap-5">
              <Field
                label="Workouts logged"
                value={`${row.workouts.toLocaleString()} (${Number(row.kcal || 0).toLocaleString()} kcal)`}
              />
              <Field label="FitCoins" value={`🪙 ${row.fitcoins.toLocaleString()}`} />
              <Field label="AI calls" value={row.ai_calls.toLocaleString()} />
              <Field
                label="Status"
                value={
                  <Badge
                    className={
                      (row.status === "banned"
                        ? "bg-red-50 dark:bg-red-500/15 text-red-700 border-red-200"
                        : "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 border-emerald-200") +
                      " 3xl:text-xs 3xl:px-3 3xl:py-1 4xl:text-sm"
                    }
                  >
                    {row.status || "active"}
                  </Badge>
                }
              />
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-2xs 3xl:text-xs 4xl:text-sm text-slate-400">{label}</div>
      <div className="text-xs 3xl:text-sm 4xl:text-base font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
        {value}
      </div>
    </div>
  );
}
