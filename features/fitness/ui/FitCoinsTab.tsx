"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHasPermission } from "@/stores/permission-context";
import type { RedemptionAction, RedemptionStatus } from "@/features/fitness/schema/moderation";

/**
 * FitCoins reward-system tab (FITNESS_MOCKUP_GAP_ANALYSIS.md, D8).
 *
 * - Activity tiers: coin amount per activity — read by the completion
 *   trigger at award time, so edits apply immediately with no deploy.
 * - Rewards catalog: what coins can be redeemed for (fitcoin_rewards).
 * - Recent redemptions + purpose/usage copy.
 * - Editing requires fitcoins.manage; viewing requires fitcoins.view
 *   (both also enforced server-side on /api/fitness/fitcoins).
 */

type ActivityTier = {
  activity_key: string;
  label: string;
  coins: number;
  daily_cap: number | null;
  purpose: string | null;
  is_active: boolean;
};

type Reward = {
  id: string;
  name: string;
  description: string | null;
  cost: number;
  is_active: boolean;
};


type RedemptionRow = {
  id: string;
  user_name: string;
  cost_at_redemption: number;
  redeemed_at: string;
  status: RedemptionStatus;
  rejection_reason: string | null;
  fitcoin_rewards?: { name: string } | null;
};

type LedgerRow = {
  id: string;
  user_name: string;
  amount: number;
  transaction_type: string;
  created_at: string;
};

const FitCoinsTab = () => {
  const canManage = useHasPermission("fitcoins.manage");

  const [tiers, setTiers] = useState<ActivityTier[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Tier edit state keyed by activity_key.
  const [tierDrafts, setTierDrafts] = useState<Record<string, { coins: string; daily_cap: string }>>({});
  const [savingTier, setSavingTier] = useState<string | null>(null);

  // Reward create form.
  const [newRewardName, setNewRewardName] = useState("");
  const [newRewardCost, setNewRewardCost] = useState("");
  const [creatingReward, setCreatingReward] = useState(false);

  // Ledger pagination.
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerOffset, setLedgerOffset] = useState(0);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const ledgerLimit = 15;

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fitness/fitcoins", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load FitCoins config");
      setTiers(json.tiers ?? []);
      setRewards(json.rewards ?? []);
      setRedemptions(json.redemptions?.rows ?? []);
      setTierDrafts(
        Object.fromEntries(
          (json.tiers ?? []).map((t: ActivityTier) => [
            t.activity_key,
            { coins: String(t.coins), daily_cap: t.daily_cap === null ? "" : String(t.daily_cap) },
          ]),
        ),
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLedger = useCallback(async () => {
    setLedgerLoading(true);
    try {
      const params = new URLSearchParams({
        resource: "ledger",
        limit: String(ledgerLimit),
        offset: String(ledgerOffset),
      });
      const res = await fetch(`/api/fitness/fitcoins?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load ledger");
      setLedger(json.rows ?? []);
      setLedgerTotal(json.total ?? 0);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLedgerLoading(false);
    }
  }, [ledgerOffset]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  const saveTier = async (tier: ActivityTier) => {
    const draft = tierDrafts[tier.activity_key];
    if (!draft) return;
    setSavingTier(tier.activity_key);
    try {
      const body: Record<string, unknown> = {
        activityKey: tier.activity_key,
        coins: Math.max(0, parseInt(draft.coins, 10) || 0),
        dailyCap: draft.daily_cap ? Math.max(1, parseInt(draft.daily_cap, 10) || 1) : null,
      };
      const res = await fetch("/api/fitness/fitcoins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      toast.success(`${tier.label}: rewards updated`);
      loadOverview();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingTier(null);
    }
  };

  const toggleTier = async (tier: ActivityTier) => {
    try {
      const res = await fetch("/api/fitness/fitcoins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityKey: tier.activity_key, isActive: !tier.is_active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      loadOverview();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const createReward = async () => {
    const cost = parseInt(newRewardCost, 10);
    if (!newRewardName.trim() || !cost || cost <= 0) {
      toast.error("Reward name and a positive coin cost are required");
      return;
    }
    setCreatingReward(true);
    try {
      const res = await fetch("/api/fitness/fitcoins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRewardName.trim(), cost }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Create failed");
      toast.success("Reward added to catalog");
      setNewRewardName("");
      setNewRewardCost("");
      loadOverview();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreatingReward(false);
    }
  };

  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const reviewRedemption = async (
    redemptionId: string,
    action: RedemptionAction,
  ) => {
    let reason: string | undefined;
    if (action === "reject") {
      reason = window.prompt("Reason for rejecting this redemption (coins will be refunded):") ?? undefined;
      if (!reason?.trim()) return;
    }
    setReviewingId(redemptionId);
    try {
      const res = await fetch(`/api/fitness/fitcoins/redemptions/${redemptionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Review failed");
      toast.success(
        action === "approve" ? "Redemption approved" : action === "fulfill" ? "Marked fulfilled" : "Redemption rejected, coins refunded",
      );
      loadOverview();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setReviewingId(null);
    }
  };

  const toggleReward = async (reward: Reward) => {
    try {
      const res = await fetch("/api/fitness/fitcoins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId: reward.id, isActive: !reward.is_active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      loadOverview();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Purpose & usage ── */}
      <div className="alert bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm font-medium leading-relaxed">
        <span className="font-black">🪙 What are FitCoins?</span> FitCoins reward activity:
        completing workouts, outdoor events, streak milestones and challenges earns coins,
        which users redeem against the rewards catalog below. Amounts here are read by the
        award trigger at completion time — edits apply to future awards immediately and are
        audit-logged. Coins are only ever minted by the completion pipeline, never by this
        panel.
      </div>

      {/* ── Activity tiers ── */}
      <div className="card bg-white">
        <h3 className="text-xl font-black text-slate-800 mb-1">🎯 Reward Tiers by Activity</h3>
        <p className="text-sm text-slate-500 font-medium mb-4">
          Coins awarded per activity. Daily cap limits repeat awards per user per day
          (blank = unlimited).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <th className="py-2 pr-4">Activity</th>
                <th className="py-2 pr-4">Purpose</th>
                <th className="py-2 pr-4 w-24">Coins</th>
                <th className="py-2 pr-4 w-24">Daily cap</th>
                <th className="py-2 pr-4">Active</th>
                {canManage && <th className="py-2" />}
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => {
                const draft = tierDrafts[tier.activity_key] ?? { coins: "", daily_cap: "" };
                return (
                  <tr key={tier.activity_key} className="border-b border-slate-50">
                    <td className="py-3 pr-4">
                      <span className="text-[12px] font-bold text-slate-800">{tier.label}</span>
                      <div className="text-[9px] text-slate-400 font-mono">{tier.activity_key}</div>
                    </td>
                    <td className="py-3 pr-4 text-[11px] text-slate-500 max-w-[280px]">
                      {tier.purpose ?? "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="number"
                        min={0}
                        disabled={!canManage}
                        className="w-20 h-8 px-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                        value={draft.coins}
                        onChange={(e) =>
                          setTierDrafts((prev) => ({
                            ...prev,
                            [tier.activity_key]: { ...draft, coins: e.target.value },
                          }))
                        }
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="number"
                        min={1}
                        placeholder="∞"
                        disabled={!canManage}
                        className="w-20 h-8 px-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50"
                        value={draft.daily_cap}
                        onChange={(e) =>
                          setTierDrafts((prev) => ({
                            ...prev,
                            [tier.activity_key]: { ...draft, daily_cap: e.target.value },
                          }))
                        }
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <button
                        disabled={!canManage}
                        onClick={() => toggleTier(tier)}
                        className={`badge h-5 text-[9px] uppercase font-black cursor-pointer ${
                          tier.is_active ? "badge-green" : "badge-slate"
                        }`}
                      >
                        {tier.is_active ? "Active" : "Paused"}
                      </button>
                    </td>
                    {canManage && (
                      <td className="py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={savingTier === tier.activity_key}
                          onClick={() => saveTier(tier)}
                        >
                          {savingTier === tier.activity_key && (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          )}
                          Save
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Rewards catalog ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-white">
          <h3 className="text-xl font-black text-slate-800 mb-4">🎁 Redemption Catalog</h3>
          {rewards.length === 0 ? (
            <p className="text-sm text-slate-400 font-medium py-4">No rewards defined yet.</p>
          ) : (
            <div className="space-y-2">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100"
                >
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold text-slate-800 truncate">
                      {reward.name}
                    </div>
                    {reward.description && (
                      <div className="text-[10px] text-slate-400 truncate">{reward.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="badge badge-gold h-5 text-[9px] font-black">
                      🪙 {reward.cost.toLocaleString()}
                    </span>
                    {canManage && (
                      <button
                        onClick={() => toggleReward(reward)}
                        className={`badge h-5 text-[9px] uppercase font-black cursor-pointer ${
                          reward.is_active ? "badge-green" : "badge-slate"
                        }`}
                      >
                        {reward.is_active ? "Live" : "Off"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {canManage && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
              <input
                placeholder="Reward name"
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl"
                value={newRewardName}
                onChange={(e) => setNewRewardName(e.target.value)}
              />
              <input
                placeholder="Cost"
                type="number"
                min={1}
                className="w-24 px-3 py-2 text-sm border border-slate-200 rounded-xl"
                value={newRewardCost}
                onChange={(e) => setNewRewardCost(e.target.value)}
              />
              <Button
                onClick={createReward}
                disabled={creatingReward}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {creatingReward && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add
              </Button>
            </div>
          )}
        </div>

        {/* ── Recent redemptions ── */}
        <div className="card bg-white">
          <h3 className="text-xl font-black text-slate-800 mb-4">🧾 Recent Redemptions</h3>
          <p className="text-[11px] text-slate-400 font-medium mb-3">
            Coins are reserved the moment a user requests a reward. Approve once fulfilment is
            confirmed on your end, or reject to refund the coins.
          </p>
          {redemptions.length === 0 ? (
            <p className="text-sm text-slate-400 font-medium py-4">No redemptions yet.</p>
          ) : (
            <div className="space-y-2">
              {redemptions.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100"
                >
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold text-slate-800 truncate">{r.user_name}</div>
                    <div className="text-[10px] text-slate-400">
                      {r.fitcoin_rewards?.name ?? "Reward"} ·{" "}
                      {new Date(r.redeemed_at).toLocaleDateString()}
                    </div>
                    {r.status === "rejected" && r.rejection_reason && (
                      <div className="text-[9px] text-red-500 mt-0.5 truncate">
                        Rejected: {r.rejection_reason}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="badge badge-red h-5 text-[9px] font-black">
                      −{r.cost_at_redemption.toLocaleString()} 🪙
                    </span>
                    <span
                      className={`badge h-5 text-[9px] uppercase font-black ${
                        r.status === "pending"
                          ? "badge-amber"
                          : r.status === "approved"
                            ? "badge-blue"
                            : r.status === "fulfilled"
                              ? "badge-green"
                              : "badge-slate"
                      }`}
                    >
                      {r.status}
                    </span>
                    {canManage && r.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reviewingId === r.id}
                          onClick={() => reviewRedemption(r.id, "approve")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reviewingId === r.id}
                          onClick={() => reviewRedemption(r.id, "reject")}
                          className="text-red-600 hover:text-red-700"
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {canManage && r.status === "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reviewingId === r.id}
                        onClick={() => reviewRedemption(r.id, "fulfill")}
                      >
                        Mark fulfilled
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Ledger ── */}
      <div className="card bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-slate-800">📒 FitCoins Ledger</h3>
          <span className="badge badge-slate text-[9px] font-black">
            {ledgerTotal.toLocaleString()} entries
          </span>
        </div>
        {ledgerLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          </div>
        ) : ledger.length === 0 ? (
          <p className="text-sm text-slate-400 font-medium py-4">No ledger entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50">
                    <td className="py-2.5 pr-4 text-[11px] font-bold text-slate-700">{row.user_name}</td>
                    <td className="py-2.5 pr-4 text-[10px] font-mono text-slate-500">{row.transaction_type}</td>
                    <td className={`py-2.5 pr-4 text-[11px] font-black ${Number(row.amount) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {Number(row.amount) >= 0 ? "+" : ""}
                      {Number(row.amount).toLocaleString()}
                    </td>
                    <td className="py-2.5 text-[11px] text-slate-500">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {ledgerTotal > ledgerLimit && (
          <div className="flex items-center justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" disabled={ledgerOffset === 0} onClick={() => setLedgerOffset(Math.max(0, ledgerOffset - ledgerLimit))}>
              Prev
            </Button>
            <Button variant="outline" size="sm" disabled={ledgerOffset + ledgerLimit >= ledgerTotal} onClick={() => setLedgerOffset(ledgerOffset + ledgerLimit)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FitCoinsTab;
