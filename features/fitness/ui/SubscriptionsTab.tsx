"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserSearchSelect } from "@/components/UserSearchSelect";
import { useHasPermission, usePermissionContext } from "@/stores/permission-context";

/**
 * Subscriptions tab (FITNESS_MOCKUP_GAP_ANALYSIS.md, D6).
 * - Grant/revoke premium & lifetime access: SUPER ADMIN only (server
 *   enforced too — /api/subscriptions/admin POST/PATCH checks the role).
 * - Paystack payments arrive later as source='paystack' rows; this UI
 *   lists them unchanged.
 * - Fitness alert composer writes into the shared notifications inbox
 *   (no parallel feed — decision D1).
 */

type SubscriptionRow = {
  id: string;
  user_id: string;
  user_name: string;
  status: "active" | "expired" | "revoked";
  source: string;
  granted_by_name: string | null;
  starts_at: string;
  expires_at: string | null;
  note: string | null;
  subscription_tiers?: { key: string; name: string } | null;
};

const FITNESS_ALERT_TYPES = [
  { value: "workout_reminder", label: "Workout reminder" },
  { value: "challenge", label: "Challenge" },
  { value: "streak_alert", label: "Streak alert" },
  { value: "billing", label: "Billing" },
  { value: "recovery", label: "Recovery" },
  { value: "nutrition", label: "Nutrition" },
] as const;

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleDateString() : "Lifetime";

const statusBadge: Record<string, string> = {
  active: "badge-green",
  expired: "badge-slate",
  revoked: "badge-red",
};

const SubscriptionsTab = () => {
  const { userRole } = usePermissionContext();
  const canSendAlerts = useHasPermission("fitness_notifications.send");
  const isSuperAdmin = userRole === "super_admin";

  // ── List state ──────────────────────────────────────────────
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/subscriptions/admin?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load subscriptions");
      setRows(json.subscriptions ?? []);
      setTotal(json.total ?? 0);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [offset, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Grant form state ────────────────────────────────────────
  const [grantUser, setGrantUser] = useState("");
  const [grantTier, setGrantTier] = useState<"premium" | "lifetime">("premium");
  const [grantDays, setGrantDays] = useState("");
  const [grantNote, setGrantNote] = useState("");
  const [granting, setGranting] = useState(false);

  const handleGrant = async () => {
    if (!grantUser) {
      toast.error("Select a user first");
      return;
    }
    setGranting(true);
    try {
      const body: Record<string, unknown> = { userId: grantUser, tierKey: grantTier };
      if (grantTier === "premium" && grantDays) body.durationDays = Number(grantDays);
      if (grantNote.trim()) body.note = grantNote.trim();
      const res = await fetch("/api/subscriptions/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Grant failed");
      toast.success(`${grantTier === "lifetime" ? "Lifetime premium" : "Premium"} assigned`);
      setGrantUser("");
      setGrantDays("");
      setGrantNote("");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (row: SubscriptionRow) => {
    if (!confirm(`Revoke ${row.subscription_tiers?.name ?? "premium"} access for ${row.user_name}?`)) return;
    try {
      const res = await fetch("/api/subscriptions/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: row.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Revoke failed");
      toast.success("Subscription revoked");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  // ── Alert composer state ────────────────────────────────────
  const [alertUser, setAlertUser] = useState("");
  const [alertTargets, setAlertTargets] = useState<string[]>([]);
  const [alertType, setAlertType] = useState<string>("workout_reminder");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertBody, setAlertBody] = useState("");
  const [sending, setSending] = useState(false);

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
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Grant panel (super admin only) ── */}
      {isSuperAdmin ? (
        <div className="card bg-white dark:bg-slate-800">
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-1">💳 Assign Premium Access</h3>
          <p className="text-sm text-slate-500 font-medium mb-4">
            Super-admin only. Grants are recorded with your admin id and the user is
            notified in-app. Paystack purchases will appear here automatically once
            payment collection is enabled.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">User</label>
              <UserSearchSelect value={grantUser} onValueChange={setGrantUser} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tier</label>
              <select
                className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
                value={grantTier}
                onChange={(e) => setGrantTier(e.target.value as "premium" | "lifetime")}
              >
                <option value="premium">Premium (30 days)</option>
                <option value="lifetime">Lifetime Premium</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                Days {grantTier === "lifetime" ? "(n/a)" : "(optional)"}
              </label>
              <input
                type="number"
                min={1}
                disabled={grantTier === "lifetime"}
                placeholder="30"
                className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl disabled:bg-slate-50 disabled:text-slate-300"
                value={grantDays}
                onChange={(e) => setGrantDays(e.target.value)}
              />
            </div>
            <Button
              onClick={handleGrant}
              disabled={granting}
              className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {granting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </div>
          <input
            placeholder="Note (optional, stored with the grant for audit)"
            className="w-full mt-3 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl"
            value={grantNote}
            onChange={(e) => setGrantNote(e.target.value)}
          />
        </div>
      ) : (
        <div className="alert bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 p-3 rounded-lg text-sm font-medium">
          Assigning or revoking premium access is restricted to the super admin. You can
          still review entitlements below.
        </div>
      )}

      {/* ── Subscriptions table ── */}
      <div className="card bg-white dark:bg-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">🧾 Entitlements</h3>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {total.toLocaleString()} subscription record(s)
            </p>
          </div>
          <select
            className="h-9 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setOffset(0);
            }}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-400 font-medium py-8 text-center">
            No subscriptions match this filter yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-2xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Tier</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 pr-4">Starts</th>
                  <th className="py-2 pr-4">Expires</th>
                  <th className="py-2 pr-4">Granted by</th>
                  {isSuperAdmin && <th className="py-2" />}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <td className="py-3 pr-4 text-sm font-bold text-slate-800 dark:text-slate-200">{row.user_name}</td>
                    <td className="py-3 pr-4">
                      <span className="badge badge-blue h-5 text-3xs uppercase font-black">
                        {row.subscription_tiers?.name ?? "—"}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`badge h-5 text-3xs uppercase font-black ${statusBadge[row.status] ?? "badge-slate"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs font-semibold text-slate-600 dark:text-slate-300">{row.source}</td>
                    <td className="py-3 pr-4 text-xs text-slate-600 dark:text-slate-300">{fmtDate(row.starts_at)}</td>
                    <td className="py-3 pr-4 text-xs text-slate-600 dark:text-slate-300">{fmtDate(row.expires_at)}</td>
                    <td className="py-3 pr-4 text-xs text-slate-600 dark:text-slate-300">{row.granted_by_name ?? "—"}</td>
                    {isSuperAdmin && (
                      <td className="py-3 text-right">
                        {row.status === "active" && (
                          <button
                            onClick={() => handleRevoke(row)}
                            className="text-2xs font-black uppercase text-red-500 hover:text-red-700 dark:hover:text-red-400"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > limit && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs font-bold text-slate-400">
              {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
                Prev
              </Button>
              <Button variant="outline" size="sm" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Fitness alert composer (shared inbox, decision D1) ── */}
      {canSendAlerts && (
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
      )}
    </div>
  );
};

export default SubscriptionsTab;
