"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Modal from "@/components/redesign/Modal";
import { cn } from "@/lib/utils";
import type { Row } from "@/features/period/schema/types";
import { date, dateTime, shortId, status } from "./formatters";


export default function TriviaOperations({
  events,
  leads,
  rewards,
  submissions,
  rankings,
  fulfillments,
  blockedDevices,
  rules,
  rewardTiers,
  criteriaTypes,
  saving,
  mutate,
}: {
  events: Row[];
  leads: Row[];
  rewards: Row[];
  submissions: Row[];
  rankings: Row;
  fulfillments: Row[];
  blockedDevices: Row[];
  rules: Row[];
  rewardTiers: Row[];
  criteriaTypes: Row[];
  saving: boolean;
  mutate: (body: any, message: string) => Promise<boolean>;
}) {
  const [rankingView, setRankingView] = useState<"current" | "monthly" | "overall">("current");
  const [tierEventId, setTierEventId] = useState<string>("");
  const [tierForm, setTierForm] = useState<{ rewardId: string; tierLabel: string; tierOrder: string; criteriaType: string; criteriaParams: string; maxWinners: string; stackable: boolean }>({
    rewardId: "", tierLabel: "", tierOrder: "1", criteriaType: "", criteriaParams: "{}", maxWinners: "", stackable: false,
  });
  const rewardById = new Map(rewards.map((reward) => [reward.id, reward]));
  const submissionById = new Map(
    submissions.map((submission) => [submission.id, submission]),
  );
  const leadBySubmission = new Map(
    leads
      .filter((lead) => lead.submission_id)
      .map((lead) => [lead.submission_id, lead]),
  );
  const activeBlocks = blockedDevices.filter(
    (item) => item.status !== "unblocked",
  );
  const latestEvent = rankings.latestEvent as Row | null | undefined;
  const fulfillmentRows = latestEvent
    ? fulfillments.filter((item) => item.event_id === latestEvent.id)
    : fulfillments;
  const pendingFulfillments = fulfillmentRows.filter((item) => item.prize_status === "pending").length;
  const sentFulfillments = fulfillmentRows.filter((item) => item.prize_status === "sent").length;
  const fulfilledCount = fulfillmentRows.filter((item) => item.prize_status === "fulfilled").length;
  const currentRanking = (rankings.current ?? []) as Row[];
  const monthlyRanking = (rankings.monthly ?? []) as Row[];
  const overallRanking = (rankings.overall ?? []) as Row[];

  const participantLabel = (identifier: string | null | undefined) => {
    if (!identifier) return "Guest";
    let hash = 0;
    for (let index = 0; index < identifier.length; index += 1) {
      hash = (Math.imul(hash, 31) + identifier.charCodeAt(index)) | 0;
    }
    return `Player ${String((Math.abs(hash) % 99) + 1).padStart(2, "0")}`;
  };
  const duration = (seconds: unknown) => {
    if (seconds == null || !Number.isFinite(Number(seconds))) return "—";
    const total = Math.max(0, Number(seconds));
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };
  const rank = (value: number, lifetime = false) =>
    value === 1 ? `${lifetime ? "🌟" : "🥇"} 1` : value === 2 ? "🥈 2" : value === 3 ? "🥉 3" : String(value);
  const linkedEvents = (rewardId: string) => events.filter((event) => event.reward_id === rewardId);

  const activeRewards = rewards.filter((reward) => reward.is_active);
  const criteriaByKey = new Map(criteriaTypes.map((item) => [item.key, item]));
  const selectedTierEvent = events.find((event) => event.id === tierEventId) ?? events[0] ?? null;
  const eventTiers = selectedTierEvent
    ? rewardTiers.filter((tier) => tier.source_id === selectedTierEvent.id).sort((a, b) => Number(a.tier_order) - Number(b.tier_order))
    : [];
  const eventEnded = selectedTierEvent ? new Date(selectedTierEvent.ends_at).getTime() <= Date.now() : false;
  const worstCaseBudget = eventTiers.reduce<Record<string, number>>((acc, tier) => {
    const reward = rewardById.get(tier.reward_id);
    if (!reward?.amount || !reward.currency || !tier.max_winners) return acc;
    acc[reward.currency] = (acc[reward.currency] ?? 0) + Number(reward.amount) * Number(tier.max_winners);
    return acc;
  }, {});

  const submitTier = async () => {
    if (!selectedTierEvent || !tierForm.rewardId || !tierForm.tierLabel.trim() || !tierForm.criteriaType) return;
    let criteriaParams: Record<string, unknown> = {};
    try { criteriaParams = tierForm.criteriaParams.trim() ? JSON.parse(tierForm.criteriaParams) : {}; }
    catch { alert("Criteria params must be valid JSON, e.g. {\"n\": 10}"); return; }
    const ok = await mutate(
      {
        action: "create_reward_tier",
        eventId: selectedTierEvent.id,
        rewardId: tierForm.rewardId,
        tierLabel: tierForm.tierLabel.trim(),
        tierOrder: Number(tierForm.tierOrder) || 1,
        criteriaType: tierForm.criteriaType,
        criteriaParams,
        maxWinners: tierForm.maxWinners ? Number(tierForm.maxWinners) : undefined,
        stackable: tierForm.stackable,
      },
      "Reward tier added.",
    );
    if (ok) setTierForm({ rewardId: "", tierLabel: "", tierOrder: String(eventTiers.length + 2), criteriaType: "", criteriaParams: "{}", maxWinners: "", stackable: false });
  };

  return (
    <div className="space-y-4">
      <section className="card overflow-hidden" aria-labelledby="trivia-prizes-heading">
        <div className="card-header">
          <div>
            <h3 id="trivia-prizes-heading" className="card-title">🏆 Trivia prizes &amp; rewards</h3>
            <p className="text-2xs text-slate-500">
              Published prizes are read from the reward catalog and shown on the mobile Trivia page before play.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="badge badge-green">📱 {rewards.filter((reward) => reward.is_active).length} visible in-app</span>
            <Link href="/ai-hub/period" className="btn btn-primary btn-sm">Manage prizes</Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead><tr className="border-b bg-slate-50 dark:bg-slate-900">
              <th className="p-3">Icon</th><th className="p-3">Prize name</th><th className="p-3">Type</th><th className="p-3">Value</th><th className="p-3">Availability</th><th className="p-3">Eligibility</th><th className="p-3">Linked event</th><th className="p-3">Status</th><th className="p-3">Mobile visibility</th>
            </tr></thead>
            <tbody>
              {rewards.map((reward) => {
                const rewardEvents = linkedEvents(reward.id);
                return <tr key={reward.id} className={cn("border-b", !reward.is_active && "opacity-65")}>
                  <td className="p-3 text-lg">{reward.icon || "🎁"}</td>
                  <td className="p-3"><div className="font-semibold">{reward.name}</div><div className="mt-0.5 text-2xs text-slate-500">{reward.description || "Trivia reward"}</div></td>
                  <td className="p-3"><span className="badge badge-purple capitalize">{String(reward.reward_type ?? "prize").replaceAll("_", " ")}</span></td>
                  <td className="p-3 font-semibold">{reward.value || "—"}</td>
                  <td className="p-3">{rewardEvents.length ? `${rewardEvents.length} linked event${rewardEvents.length === 1 ? "" : "s"}` : "Reward catalog"}</td>
                  <td className="max-w-56 p-3 text-2xs text-slate-600 dark:text-slate-400">{reward.description || "Set by the linked Trivia event and prize tier."}</td>
                  <td className="p-3 text-2xs">{rewardEvents.length ? rewardEvents.slice(0, 2).map((event) => event.title).join(", ") : "Not linked"}</td>
                  <td className="p-3"><span className={cn("badge", reward.is_active ? "badge-green" : "badge-amber")}>{reward.is_active ? "✅ Published" : "📝 Draft"}</span></td>
                  <td className="p-3"><span className={cn("badge", reward.is_active ? "badge-green" : "badge-slate")}>{reward.is_active ? "👁 Visible in-app" : "Hidden until published"}</span></td>
                </tr>;
              })}
              {!rewards.length && <tr><td colSpan={9} className="p-4 text-slate-500">No Trivia prizes have been configured.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="card overflow-hidden"
        aria-labelledby="trivia-rankings-heading"
      >
        <div className="card-header">
          <div>
            <h3 id="trivia-rankings-heading" className="card-title">
              🏆 Trivia leads &amp; rankings
            </h3>
            <p className="text-2xs text-slate-500">
              Consent-gated leads stay masked. Public boards use anonymous player labels; ties resolve by score, fastest time, then submission time.
            </p>
          </div>
          <span className="badge badge-blue">🔒 Privacy-hashed</span>
        </div>
        <div className="flex flex-wrap gap-2 border-b px-4 py-3" role="tablist" aria-label="Trivia ranking period">
          {([
            ["current", `🔥 Just ended${latestEvent?.title ? ` — ${latestEvent.title}` : ""}`],
            ["monthly", `📅 Monthly — ${rankings.monthLabel ?? "Current month"}`],
            ["overall", "🌟 Overall (lifetime)"],
          ] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={rankingView === value} className={cn("btn btn-sm", rankingView === value ? "btn-primary" : "btn-secondary")} onClick={() => setRankingView(value)}>{label}</button>)}
        </div>
        <div className="overflow-x-auto">
          {rankingView === "current" && <table className="w-full min-w-[880px] text-left text-xs"><thead><tr className="border-b bg-slate-50 dark:bg-slate-900"><th className="p-3">Rank</th><th className="p-3">Player</th><th className="p-3">User link</th><th className="p-3">Consented lead</th><th className="p-3">Score</th><th className="p-3">Time</th><th className="p-3">Submitted</th><th className="p-3">Device check</th></tr></thead><tbody>
            {currentRanking.map((item) => <tr key={`${item.userId ?? item.participant}-${item.rank}`} className="border-b"><td className="p-3 font-extrabold">{rank(Number(item.rank))}</td><td className="p-3 font-semibold">{item.participant}</td><td className="p-3"><code className="text-2xs">{item.userId ? shortId(item.userId) : "Guest"}</code></td><td className="p-3 text-2xs">{item.consentedLead ? <>{item.consentedLead}<br/><span className="text-slate-500">{item.consentVersion}</span></> : <span className="text-slate-500">No consented lead</span>}</td><td className="p-3 font-bold text-emerald-700 dark:text-emerald-400">{item.score}/{item.questionCount}</td><td className="p-3">{duration(item.durationSeconds)}</td><td className="p-3 text-2xs text-slate-500">{dateTime(item.submittedAt)}</td><td className="p-3"><span className="badge badge-green">✅ Unique</span></td></tr>)}
            {!currentRanking.length && <tr><td colSpan={8} className="p-4 text-slate-500">No submissions are available for the most recently ended Trivia.</td></tr>}
          </tbody></table>}
          {rankingView === "monthly" && <table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b bg-slate-50 dark:bg-slate-900"><th className="p-3">Rank</th><th className="p-3">Player</th><th className="p-3">Events entered</th><th className="p-3">Total score</th><th className="p-3">Perfect scores</th><th className="p-3">Best time</th><th className="p-3">Last played</th></tr></thead><tbody>
            {monthlyRanking.map((item) => <tr key={`${item.userId ?? item.participant}-${item.rank}`} className="border-b"><td className="p-3 font-extrabold">{rank(Number(item.rank))}</td><td className="p-3 font-semibold">{item.participant}</td><td className="p-3">{item.eventsEntered}</td><td className="p-3 font-bold text-emerald-700 dark:text-emerald-400">{item.totalScore} / {item.totalQuestions}</td><td className="p-3">{item.perfectScores}</td><td className="p-3">{duration(item.bestTimeSeconds)}</td><td className="p-3 text-2xs text-slate-500">{date(item.lastPlayedAt)}</td></tr>)}
            {!monthlyRanking.length && <tr><td colSpan={7} className="p-4 text-slate-500">No submissions are available for this month.</td></tr>}
          </tbody></table>}
          {rankingView === "overall" && <table className="w-full min-w-[680px] text-left text-xs"><thead><tr className="border-b bg-slate-50 dark:bg-slate-900"><th className="p-3">Rank</th><th className="p-3">Player</th><th className="p-3">Lifetime score</th><th className="p-3">Events played</th><th className="p-3">Titles won</th><th className="p-3">Member since</th></tr></thead><tbody>
            {overallRanking.map((item) => <tr key={`${item.userId ?? item.participant}-${item.rank}`} className="border-b"><td className="p-3 font-extrabold">{rank(Number(item.rank), true)}</td><td className="p-3 font-semibold">{item.participant}</td><td className="p-3 font-bold text-emerald-700 dark:text-emerald-400">{item.lifetimeScore} points</td><td className="p-3">{item.eventsPlayed}</td><td className="p-3">{Number(item.titlesWon) > 0 ? <span className="badge badge-green">🏆 {item.titlesWon} title{Number(item.titlesWon) === 1 ? "" : "s"}</span> : "—"}</td><td className="p-3 text-2xs text-slate-500">{date(item.memberSince)}</td></tr>)}
            {!overallRanking.length && <tr><td colSpan={6} className="p-4 text-slate-500">No lifetime ranking data is available yet.</td></tr>}
          </tbody></table>}
        </div>
      </section>

      <section
        className="card overflow-hidden"
        aria-labelledby="trivia-fulfillment-heading"
      >
        <div className="card-header">
          <div>
            <h3 id="trivia-fulfillment-heading" className="card-title">
              🎁 Winners &amp; prize fulfillment{latestEvent?.title ? ` — ${latestEvent.title}` : ""}
            </h3>
            <p className="text-2xs text-slate-500">
              One row per winner × prize tier. Sending a prize triggers the in-app confirmation prompt; fulfillment closes the payout loop.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2"><span className="badge badge-amber">📤 {pendingFulfillments} to send</span><span className="badge badge-blue">⏳ {sentFulfillments} awaiting confirmation</span><span className="badge badge-green">✅ {fulfilledCount} fulfilled</span></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-xs">
            <thead>
              <tr className="border-b bg-slate-50 dark:bg-slate-900">
                <th className="p-3">Tier</th><th className="p-3">Prize</th><th className="p-3">Winner</th><th className="p-3">Consented lead</th><th className="p-3">Eligibility met</th><th className="p-3">Prize status</th><th className="p-3">Fulfillment prompt</th><th className="p-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {fulfillmentRows.map((item) => {
                const reward = item.reward_id
                  ? rewardById.get(item.reward_id)
                  : null;
                const submission = item.submission_id
                  ? submissionById.get(item.submission_id)
                  : null;
                const lead = item.submission_id
                  ? leadBySubmission.get(item.submission_id)
                  : null;
                return (
                  <tr key={item.id} className={cn("border-b", item.prize_status === "pending" && "bg-amber-50/70 dark:bg-amber-950/20")}>
                    <td className="p-3"><span className="badge badge-blue">{item.tier_label}</span></td>
                    <td className="p-3">
                      {reward
                        ? `${reward.icon} ${reward.name}`
                        : "Unlinked prize"}
                      {reward?.reward_type === "cash" ||
                      reward?.reward_type === "airtime" ? (
                        <span className="badge badge-purple ml-2">
                          {reward.reward_type}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <span className="font-semibold">{participantLabel(submission?.user_id ?? submission?.id)}</span>{submission?.user_id && <><br/><code className="text-2xs text-slate-500">{shortId(submission.user_id)}</code></>}
                    </td>
                    <td className="p-3">
                      {lead?.mobile ?? (
                        <span className="text-2xs text-slate-500">
                          No consented lead
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-2xs">{submission ? `${submission.score}/${submission.question_count}${submission.duration_seconds != null ? ` · ${duration(submission.duration_seconds)}` : ""}` : item.notes || "Recorded by prize tier"}</td>
                    <td className="p-3">{status(item.prize_status)}</td>
                    <td className="p-3 text-2xs text-slate-500">
                      {item.prize_status === "fulfilled"
                        ? `Sent ${date(item.sent_at)} · confirmed ${date(item.confirmed_at)}`
                        : item.prize_status === "sent"
                          ? `Prompt delivered ${dateTime(item.prompt_sent_at)} · awaiting confirmation`
                          : "Not sent yet"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        {item.prize_status === "pending" && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={saving}
                            onClick={() =>
                              mutate(
                                {
                                  action: "mark_fulfillment_sent",
                                  id: item.id,
                                },
                                "Prize marked sent — the winner will now receive the in-app fulfillment prompt.",
                              )
                            }
                          >
                            Mark sent
                          </button>
                        )}
                        {item.prize_status === "sent" && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={saving}
                            onClick={() =>
                              mutate(
                                {
                                  action: "mark_fulfillment_fulfilled",
                                  id: item.id,
                                },
                                "Fulfillment complete for this winner tier.",
                              )
                            }
                          >
                            Mark fulfilled
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!fulfillmentRows.length && (
                <tr>
                  <td colSpan={8} className="p-4 text-slate-500">
                    No prize fulfillment entries yet. Winners appear here once
                    a finished event's prize tiers are recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card overflow-hidden" aria-labelledby="trivia-tiers-heading">
        <div className="card-header">
          <div>
            <h3 id="trivia-tiers-heading" className="card-title">🏗 Reward tiers</h3>
            <p className="text-2xs text-slate-500">
              Each tier pairs a reward with a pregenerated criteria type — never free text — so closing an event can only ever assign winners against a rule that's actually implemented.
            </p>
          </div>
          <select
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
            value={selectedTierEvent?.id ?? ""}
            onChange={(e) => setTierEventId(e.target.value)}
          >
            {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
          </select>
        </div>
        {selectedTierEvent && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead><tr className="border-b bg-slate-50 dark:bg-slate-900">
                  <th className="p-3">Order</th><th className="p-3">Tier label</th><th className="p-3">Criteria</th><th className="p-3">Reward</th><th className="p-3">Max winners</th><th className="p-3">Stackable</th><th className="p-3"><span className="sr-only">Actions</span></th>
                </tr></thead>
                <tbody>
                  {eventTiers.map((tier) => {
                    const reward = rewardById.get(tier.reward_id);
                    const criteria = criteriaByKey.get(tier.criteria_type);
                    return <tr key={tier.id} className="border-b">
                      <td className="p-3 font-semibold">{tier.tier_order}</td>
                      <td className="p-3">{tier.tier_label}</td>
                      <td className="p-3 text-2xs">{criteria?.label ?? tier.criteria_type}<br/><code className="text-2xs text-slate-500">{JSON.stringify(tier.criteria_params)}</code></td>
                      <td className="p-3 text-2xs">{reward ? `${reward.icon} ${reward.name}` : "Unlinked"}</td>
                      <td className="p-3">{tier.max_winners ?? "Uncapped"}</td>
                      <td className="p-3">{tier.stackable ? <span className="badge badge-blue">Stacks</span> : <span className="badge badge-slate">Exclusive</span>}</td>
                      <td className="p-3 text-right">
                        {!selectedTierEvent.closed_at && (
                          <button type="button" className="btn btn-secondary btn-sm" disabled={saving} onClick={() => mutate({ action: "delete_reward_tier", id: tier.id }, "Reward tier removed.")}>Remove</button>
                        )}
                      </td>
                    </tr>;
                  })}
                  {!eventTiers.length && <tr><td colSpan={7} className="p-4 text-slate-500">No reward tiers configured for this event yet.</td></tr>}
                </tbody>
              </table>
            </div>
            {!selectedTierEvent.closed_at && (
              <div className="flex flex-wrap items-end gap-2 border-t p-3">
                <div className="flex flex-col gap-1"><label className="text-2xs text-slate-500">Order</label><input type="number" min={1} className="w-16 rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800" value={tierForm.tierOrder} onChange={(e) => setTierForm((f) => ({ ...f, tierOrder: e.target.value }))} /></div>
                <div className="flex flex-col gap-1"><label className="text-2xs text-slate-500">Tier label</label><input className="w-40 rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800" placeholder="e.g. 1st place" value={tierForm.tierLabel} onChange={(e) => setTierForm((f) => ({ ...f, tierLabel: e.target.value }))} /></div>
                <div className="flex flex-col gap-1"><label className="text-2xs text-slate-500">Reward</label><select className="w-48 rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800" value={tierForm.rewardId} onChange={(e) => setTierForm((f) => ({ ...f, rewardId: e.target.value }))}><option value="">Select a reward…</option>{activeRewards.map((reward) => <option key={reward.id} value={reward.id}>{reward.icon} {reward.name}</option>)}</select></div>
                <div className="flex flex-col gap-1"><label className="text-2xs text-slate-500">Criteria</label><select className="w-44 rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800" value={tierForm.criteriaType} onChange={(e) => setTierForm((f) => ({ ...f, criteriaType: e.target.value }))}><option value="">Select criteria…</option>{criteriaTypes.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></div>
                <div className="flex flex-col gap-1"><label className="text-2xs text-slate-500">Params (JSON)</label><input className="w-32 rounded-md border border-slate-300 px-2 py-1 text-xs font-mono dark:border-slate-600 dark:bg-slate-800" placeholder='{"n": 10}' value={tierForm.criteriaParams} onChange={(e) => setTierForm((f) => ({ ...f, criteriaParams: e.target.value }))} /></div>
                <div className="flex flex-col gap-1"><label className="text-2xs text-slate-500">Max winners</label><input type="number" min={1} className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800" placeholder="Uncapped" value={tierForm.maxWinners} onChange={(e) => setTierForm((f) => ({ ...f, maxWinners: e.target.value }))} /></div>
                <label className="flex items-center gap-1 text-2xs text-slate-500"><input type="checkbox" checked={tierForm.stackable} onChange={(e) => setTierForm((f) => ({ ...f, stackable: e.target.checked }))} /> Stackable</label>
                <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={submitTier}>Add tier</button>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3">
              <p className="text-2xs text-slate-500">
                Worst-case payout if every tier fully pays out:{" "}
                {Object.keys(worstCaseBudget).length
                  ? Object.entries(worstCaseBudget).map(([currency, amount]) => `${currency} ${amount.toLocaleString()}`).join(" + ")
                  : "No cash/currency amounts capped by max winners yet"}
              </p>
              {selectedTierEvent.closed_at ? (
                <span className="badge badge-green">✅ Closed at {dateTime(selectedTierEvent.closed_at)}</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={saving || !eventEnded || !eventTiers.length}
                  title={!eventEnded ? "This Trivia's window hasn't ended yet" : !eventTiers.length ? "Add at least one reward tier first" : undefined}
                  onClick={() => mutate({ action: "close_trivia_event", id: selectedTierEvent.id }, "Trivia closed — winners assigned and sent to the fulfillment queue.")}
                >
                  Close event &amp; assign winners
                </button>
              )}
            </div>
          </>
        )}
        {!events.length && <p className="p-4 text-xs text-slate-500">Schedule a Trivia event first to configure reward tiers.</p>}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
      <section className="card overflow-hidden" aria-labelledby="trivia-events-heading">
        <div className="card-header"><div><h3 id="trivia-events-heading" className="card-title">🗓 Scheduled &amp; past Trivias</h3><p className="text-2xs text-slate-500">Draft → ready → live → ended. Mobile unlocks only inside the reviewed Africa/Accra window.</p></div><Link href="/ai-hub/period" className="btn btn-primary btn-sm">Schedule &amp; generate</Link></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b bg-slate-50 dark:bg-slate-900"><th className="p-3">Event</th><th className="p-3">Window</th><th className="p-3">Reward</th><th className="p-3">Entries</th><th className="p-3">Status</th><th className="p-3"><span className="sr-only">Actions</span></th></tr></thead><tbody>
          {events.map((item) => { const eventReward = item.reward_id ? rewardById.get(item.reward_id) : null; return <tr key={item.id} className="border-b"><td className="p-3 font-semibold">{item.title}</td><td className="p-3 text-2xs">{dateTime(item.starts_at)}<br/><span className="text-slate-500">to {dateTime(item.ends_at)}</span></td><td className="p-3 text-2xs">{eventReward ? `${eventReward.icon || "🎁"} ${eventReward.name}` : "Not attached"}</td><td className="p-3 font-semibold">{item.entryCount ?? "—"}</td><td className="p-3">{status(item.status)}</td><td className="p-3 text-right">{item.status === "draft" && <button type="button" className="btn btn-secondary btn-sm" disabled={saving} onClick={() => mutate({ action: "review_trivia_event", id: item.id }, "Trivia is ready. The mobile countdown and start controls now follow this window.")}>Mark ready</button>}</td></tr>; })}
          {!events.length && <tr><td colSpan={6} className="p-4 text-slate-500">No Trivia event has been scheduled.</td></tr>}
        </tbody></table></div>
      </section>

      <section className="card overflow-hidden" aria-labelledby="trivia-leads-heading">
        <div className="card-header"><div><h3 id="trivia-leads-heading" className="card-title">Consented lead register</h3><p className="text-2xs text-slate-500">Encrypted at rest and masked here; linked to an account when the participant is signed in.</p></div><span className="badge badge-blue">{leads.length} records</span></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b bg-slate-50 dark:bg-slate-900"><th className="p-3">Lead</th><th className="p-3">Mobile</th><th className="p-3">Social</th><th className="p-3">User link</th><th className="p-3">Consent</th><th className="p-3">Status</th></tr></thead><tbody>
          {leads.slice(0, 20).map((lead) => <tr key={lead.id} className="border-b"><td className="p-3">{lead.name}</td><td className="p-3">{lead.mobile}</td><td className="p-3"><span className="font-medium">{lead.socialPlatform ?? "Social"}</span><br/><span className="text-2xs text-slate-500">{lead.socialHandle}</span></td><td className="p-3"><code className="text-2xs">{lead.user_id ? shortId(lead.user_id) : "Guest"}</code></td><td className="p-3 text-2xs">{lead.consent_version}<br/><span className="text-slate-500">{dateTime(lead.consented_at)}</span></td><td className="p-3">{status(lead.status)}</td></tr>)}
          {!leads.length && <tr><td colSpan={6} className="p-4 text-slate-500">No consented Trivia leads yet.</td></tr>}
        </tbody></table></div>
      </section>

        <section
          className="card overflow-hidden"
          aria-labelledby="trivia-blocked-heading"
        >
          <div className="card-header">
            <div>
              <h3 id="trivia-blocked-heading" className="card-title">
                Blocked devices &amp; users
              </h3>
              <p className="text-2xs text-slate-500">
                Privacy-hashed identifiers only — never raw device tokens or
                phone numbers. Active blocks are rejected on submit.
              </p>
            </div>
            <span className="badge badge-red">
              {activeBlocks.length} active
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-900">
                  <th className="p-3">Device hash</th>
                  <th className="p-3">Mobile hash</th>
                  <th className="p-3">Violation</th>
                  <th className="p-3">Detected</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {blockedDevices.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-3">
                      <code className="text-2xs">{shortId(item.device_hash)}</code>
                    </td>
                    <td className="p-3">
                      <code className="text-2xs">
                        {item.mobile_hash ? shortId(item.mobile_hash) : "—"}
                      </code>
                    </td>
                    <td className="p-3">
                      {String(item.violation ?? "").replaceAll("_", " ")}
                    </td>
                    <td className="p-3">{dateTime(item.detected_at)}</td>
                    <td className="p-3">{status(item.status)}</td>
                    <td className="p-3 text-right">
                      {item.status !== "unblocked" && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={saving}
                          onClick={() =>
                            mutate(
                              { action: "unblock_trivia_device", id: item.id },
                              "Device unblocked. Future submissions are accepted again.",
                            )
                          }
                        >
                          Unblock
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!blockedDevices.length && (
                  <tr>
                    <td colSpan={6} className="p-4 text-slate-500">
                      No blocked devices.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>

        <section className="card overflow-hidden" aria-labelledby="trivia-rules-heading">
          <div className="card-header">
            <div>
              <h3 id="trivia-rules-heading" className="card-title">
                Trivia rules settings
              </h3>
              <p className="text-2xs text-slate-500">
                Every change is audit-logged. The per-device question shuffle
                keeps scoring question-ID based.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-900">
                  <th className="p-3">Rule</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Value</th>
                  <th className="p-3">Enforced by</th>
                  <th className="p-3">Active</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.key} className="border-b">
                    <td className="p-3">
                      <div className="font-medium">
                        {String(rule.key).replaceAll("_", " ")}
                      </div>
                    </td>
                    <td className="max-w-md p-3 text-2xs text-slate-500">{rule.description}</td>
                    <td className="p-3">
                      <code className="text-2xs">{rule.value}</code>
                    </td>
                    <td className="p-3 text-2xs">{rule.enforced_by}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        className={cn(
                          "badge",
                          rule.is_active ? "badge-green" : "badge-slate",
                        )}
                        disabled={saving}
                        onClick={() =>
                          mutate(
                            {
                              action: "update_trivia_rule",
                              key: rule.key,
                              value: rule.value,
                              isActive: !rule.is_active,
                            },
                            `Rule ${rule.is_active ? "disabled" : "enabled"}: ${String(rule.key).replaceAll("_", " ")}.`,
                          )
                        }
                      >
                        {rule.is_active ? "On" : "Off"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!rules.length && (
                  <tr>
                    <td colSpan={5} className="p-4 text-slate-500">
                      No Trivia rules configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
    </div>
  );
}

export function TriviaBatchModal({
  batch,
  mutate,
  saving,
  onClose,
}: {
  batch: Row | null;
  mutate: (body: any, message: string) => Promise<boolean>;
  saving: boolean;
  onClose: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedIds(new Set());
  }, [batch?.batchId]);

  if (!batch) return null;
  const questions: Row[] = batch.questions ?? [];
  const allIds = questions.map((question) => question.id);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkStatus = (ids: string[], nextStatus: string, message: string) =>
    mutate(
      { action: "bulk_update_trivia_question_status", ids, status: nextStatus },
      message,
    );

  return (
    <Modal
      isOpen={Boolean(batch)}
      onClose={onClose}
      title={`${batch.source === "ai" ? "AI-generated" : "Manual"} batch — ${questions.length} question${questions.length === 1 ? "" : "s"}`}
      size="wide"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={saving || !selectedIds.size}
              onClick={() =>
                bulkStatus(
                  [...selectedIds],
                  "review",
                  "Selected questions sent to review.",
                )
              }
            >
              Submit selected for review
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={saving || !selectedIds.size}
              onClick={() =>
                bulkStatus(
                  [...selectedIds],
                  "published",
                  "Selected questions marked ready.",
                )
              }
            >
              Mark selected as ready
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={saving || !selectedIds.size}
              onClick={() =>
                bulkStatus(
                  [...selectedIds],
                  "archived",
                  "Selected questions archived.",
                )
              }
            >
              Archive selected
            </button>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={saving || !allIds.length}
            onClick={async () => {
              const markedReady = await bulkStatus(
                allIds,
                "published",
                "All questions in this batch marked ready.",
              );
              if (markedReady) onClose();
            }}
          >
            Mark all as ready
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {questions.map((question) => (
          <div
            key={question.id}
            className="rounded-lg border border-slate-200 dark:border-slate-700 p-3"
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={selectedIds.has(question.id)}
                onChange={() => toggle(question.id)}
                aria-label={`Select question: ${question.question}`}
              />
              <div className="flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  {status(question.status)}
                  <span className="text-2xs text-slate-500">
                    validation: {question.validation_status}
                  </span>
                  {question.position != null && (
                    <span className="text-2xs text-slate-400">
                      #{question.position}
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium">{question.question}</p>
                <ul className="mt-1 space-y-0.5 text-2xs text-slate-600 dark:text-slate-300">
                  {(question.options ?? []).map(
                    (option: string, index: number) => (
                      <li
                        key={index}
                        className={cn(
                          index === question.correct_option &&
                            "font-semibold text-emerald-700 dark:text-emerald-400",
                        )}
                      >
                        {String.fromCharCode(65 + index)}. {option}
                        {index === question.correct_option ? " ✓" : ""}
                      </li>
                    ),
                  )}
                </ul>
                {question.explanation && (
                  <p className="mt-1 text-2xs text-slate-500">
                    {question.explanation}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        {!questions.length && (
          <p className="text-xs text-slate-500">
            This batch has no questions.
          </p>
        )}
      </div>
    </Modal>
  );
}
