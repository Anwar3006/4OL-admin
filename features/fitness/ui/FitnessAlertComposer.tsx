"use client";

/**
 * Fitness alert composer — extracted from the old
 * features/fitness/ui/SubscriptionsTab.tsx (which is being retired as part
 * of the subscriptions-page consolidation; see
 * features/subscriptions/README.md). This card has nothing to do with
 * subscriptions — it posts to /api/fitness/notifications with
 * screen: "fitness" and fitness-specific alert types, gated by
 * fitness_notifications.send (a different permission than subscription
 * grant/revoke, which is super-admin only) — so it stays in Fitness,
 * rendered from UsersTab as an additional card below the members table.
 *
 * Delivered into the user's main notification inbox (the same bell the
 * whole app uses). Automated streak/challenge/billing alerts run daily via
 * pg_cron; this is the manual/ad-hoc path.
 */

import React, { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserSearchSelect } from "@/components/UserSearchSelect";
import { useHasPermission } from "@/stores/permission-context";

const FITNESS_ALERT_TYPES = [
  { value: "workout_reminder", label: "Workout reminder" },
  { value: "challenge", label: "Challenge" },
  { value: "streak_alert", label: "Streak alert" },
  { value: "billing", label: "Billing" },
  { value: "recovery", label: "Recovery" },
  { value: "nutrition", label: "Nutrition" },
] as const;

export default function FitnessAlertComposer() {
  const canSendAlerts = useHasPermission("fitness_notifications.send");

  const [alertUser, setAlertUser] = useState("");
  const [alertTargets, setAlertTargets] = useState<string[]>([]);
  const [alertType, setAlertType] = useState<string>("workout_reminder");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertBody, setAlertBody] = useState("");
  const [sending, setSending] = useState(false);

  if (!canSendAlerts) return null;

  const handleSendAlert = async () => {
    if (alertTargets.length === 0 || !alertTitle.trim() || !alertBody.trim()) {
      toast.error("Add at least one recipient plus a title and message");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/fitness/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: alertTargets,
          type: alertType,
          title: alertTitle.trim(),
          body: alertBody.trim(),
          screen: "fitness",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Send failed");
      toast.success(`Sent to ${json.sent} of ${alertTargets.length} user(s)`);
      setAlertTitle("");
      setAlertBody("");
      setAlertTargets([]);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card bg-white dark:bg-slate-800">
      <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-1">🔔 Send Fitness Alert</h3>
      <p className="text-sm text-slate-500 font-medium mb-4">
        Delivered into the user&apos;s main notification inbox (the same bell the whole
        app uses). Automated streak / challenge / billing alerts run daily via pg_cron.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-3">
          <UserSearchSelect
            value={alertUser}
            onValueChange={setAlertUser}
            placeholder="Add recipient..."
          />
          <Button
            variant="outline"
            size="sm"
            disabled={!alertUser || alertTargets.includes(alertUser)}
            onClick={() => {
              setAlertTargets((prev) => [...prev, alertUser]);
              setAlertUser("");
            }}
          >
            + Add recipient
          </Button>
          {alertTargets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {alertTargets.map((id) => (
                <span key={id} className="badge badge-slate text-3xs font-bold">
                  {id.slice(0, 8)}…
                  <button
                    className="ml-1 text-red-500 font-black"
                    onClick={() => setAlertTargets((prev) => prev.filter((t) => t !== id))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <select
            className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
            value={alertType}
            onChange={(e) => setAlertType(e.target.value)}
          >
            {FITNESS_ALERT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-3">
          <input
            placeholder="Title"
            maxLength={120}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl"
            value={alertTitle}
            onChange={(e) => setAlertTitle(e.target.value)}
          />
          <textarea
            placeholder="Message"
            maxLength={500}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl resize-none h-24"
            value={alertBody}
            onChange={(e) => setAlertBody(e.target.value)}
          />
          <Button
            onClick={handleSendAlert}
            disabled={sending}
            className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send alert
          </Button>
        </div>
      </div>
    </div>
  );
}
