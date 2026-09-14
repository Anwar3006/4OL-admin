"use client";

import type { Row } from "@/features/period/schema/types";


export default function PremiumOperations({
  settings,
  saving,
  mutate,
}: {
  settings: Row | null;
  saving: boolean;
  mutate: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <form
        className="card space-y-3 p-4"
        aria-label="Premium onboarding trial settings"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          mutate(
            {
              action: "update_premium_settings",
              onboardingTrialDays: Number(form.get("onboardingTrialDays")),
              expiryReminderDays: Number(form.get("expiryReminderDays") ?? 3),
              autoLockOnExpiry: form.get("autoLockOnExpiry") === "on",
              showPaywallOnExpiry: form.get("showPaywallOnExpiry") === "on",
            },
            "Premium settings saved. New signups follow the selected trial policy.",
          );
        }}
      >
        <div>
          <div className="card-title">Premium settings (Super Admin)</div>
          <p className="mt-1 text-2xs text-slate-500">
            Free Cycle Pro for every new user after Plasence onboarding. On
            expiry premium features auto-lock until the user subscribes.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="form-label">
            Free premium for new users
            <select
              name="onboardingTrialDays"
              defaultValue={String(settings?.onboarding_trial_days ?? 14)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="0">Off</option>
            </select>
          </label>
          <label className="form-label">
            Expiry reminder (days before)
            <input
              name="expiryReminderDays"
              type="number"
              min="0"
              max="14"
              defaultValue={settings?.expiry_reminder_days ?? 3}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
            />
          </label>
        </div>
        <label className="form-label flex items-center gap-2">
          <input
            name="autoLockOnExpiry"
            type="checkbox"
            defaultChecked={settings?.auto_lock_on_expiry ?? true}
          />{" "}
          Auto-lock premium features on expiry
        </label>
        <label className="form-label flex items-center gap-2">
          <input
            name="showPaywallOnExpiry"
            type="checkbox"
            defaultChecked={settings?.show_paywall_on_expiry ?? true}
          />{" "}
          Show subscribe paywall on gated actions
        </label>
        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>

      <form
        className="card space-y-3 p-4"
        aria-label="Grant premium access"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          mutate(
            {
              action: "grant_premium",
              userId: String(form.get("userId") ?? "").trim(),
              tier: form.get("tier"),
              source: form.get("source"),
              reason: form.get("reason"),
              notes: form.get("notes") || undefined,
              durationDays: Number(form.get("durationDays")),
            },
            "Premium granted with a duration cap. The grant is audit-logged and expires automatically.",
          );
        }}
      >
        <div>
          <div className="card-title">Grant premium access</div>
          <p className="mt-1 text-2xs text-slate-500">
            Super Admin only · duration-capped (max 90 days) · reason is
            mandatory and audit-logged · no indefinite access.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="form-label">
            User ID
            <input
              name="userId"
              required
              pattern="[0-9a-fA-F-]{36}"
              placeholder="uuid"
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
            />
          </label>
          {/* Single tier since Phase 0's consolidation — no more choice to
              make, but kept as a disabled field so the grant summary above
              still reads naturally. */}
          <input type="hidden" name="tier" value="cycle_pro" />
          <label className="form-label">
            Tier
            <input
              disabled
              value="Cycle Pro"
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-500"
            />
          </label>
          <label className="form-label">
            Duration cap
            <select
              name="durationDays"
              defaultValue="30"
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days (~3 months)</option>
            </select>
          </label>
          <label className="form-label">
            Source
            <select
              name="source"
              defaultValue="manual"
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
            >
              <option value="manual">Manual</option>
              <option value="trivia_prize">Trivia prize fulfillment</option>
              <option value="goodwill">Goodwill / support case</option>
              <option value="clinical_program">Clinical program</option>
              <option value="partner">Partner / ambassador</option>
              <option value="beta">Beta tester</option>
            </select>
          </label>
        </div>
        <label className="form-label">
          Reason (mandatory — audit-logged)
          <input
            name="reason"
            required
            minLength={2}
            maxLength={500}
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
            placeholder="e.g. Trivia Aug 22 — Cycle Pro 1 month prize"
          />
        </label>
        <label className="form-label">
          Notes (optional)
          <input
            name="notes"
            maxLength={1000}
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
          />
        </label>
        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? "Granting…" : "Grant premium"}
          </button>
        </div>
      </form>
    </div>
  );
}
