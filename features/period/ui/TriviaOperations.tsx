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
  fulfillments,
  blockedDevices,
  rules,
  saving,
  mutate,
}: {
  events: Row[];
  leads: Row[];
  rewards: Row[];
  submissions: Row[];
  fulfillments: Row[];
  blockedDevices: Row[];
  rules: Row[];
  saving: boolean;
  mutate: (body: any, message: string) => Promise<void>;
}) {
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
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
      <section
        className="card overflow-hidden"
        aria-labelledby="trivia-events-heading"
      >
        <div className="card-header">
          <div>
            <h3 id="trivia-events-heading" className="card-title">
              Friday schedules
            </h3>
            <p className="text-xs text-slate-500">
              The quiz unlocks only during its reviewed start/end window.
            </p>
          </div>
          <Link href="/ai-hub/period" className="btn btn-primary btn-sm">
            Schedule & generate
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="p-3">Event</th>
                <th className="p-3">Window</th>
                <th className="p-3">Status</th>
                <th className="p-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="p-3 font-medium">{item.title}</td>
                  <td className="p-3">
                    {dateTime(item.starts_at)}
                    <br />
                    <span className="text-xs text-slate-500">
                      to {dateTime(item.ends_at)}
                    </span>
                  </td>
                  <td className="p-3">{status(item.status)}</td>
                  <td className="p-3 text-right">
                    {item.status === "draft" && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={saving}
                        onClick={() =>
                          mutate(
                            { action: "review_trivia_event", id: item.id },
                            "Trivia is ready. The mobile countdown and start controls now follow this window.",
                          )
                        }
                      >
                        Mark ready
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!events.length && (
                <tr>
                  <td colSpan={4} className="p-4 text-slate-500">
                    No Trivia event has been scheduled.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section
        className="card overflow-hidden"
        aria-labelledby="trivia-leads-heading"
      >
        <div className="card-header">
          <div>
            <h3 id="trivia-leads-heading" className="card-title">
              Trivia leads
            </h3>
            <p className="text-xs text-slate-500">
              Consent-gated, encrypted and linked to user records when signed
              in.
            </p>
          </div>
          <span className="badge badge-blue">{leads.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="p-3">Lead</th>
                <th className="p-3">Mobile</th>
                <th className="p-3">Social</th>
                <th className="p-3">User link</th>
                <th className="p-3">Consent</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 20).map((lead) => (
                <tr key={lead.id} className="border-b">
                  <td className="p-3">{lead.name}</td>
                  <td className="p-3">{lead.mobile}</td>
                  <td className="p-3">
                    <span className="font-medium text-slate-700">
                      {lead.socialPlatform ?? "Social"}
                    </span>
                    <br />
                    <span className="text-xs text-slate-500">
                      {lead.socialHandle}
                    </span>
                  </td>
                  <td className="p-3">
                    <code className="text-xs">
                      {lead.user_id ? shortId(lead.user_id) : "Guest"}
                    </code>
                  </td>
                  <td className="p-3">
                    {lead.consent_version}
                    <br />
                    <span className="text-xs text-slate-500">
                      {dateTime(lead.consented_at)}
                    </span>
                  </td>
                  <td className="p-3">{status(lead.status)}</td>
                </tr>
              ))}
              {!leads.length && (
                <tr>
                  <td colSpan={6} className="p-4 text-slate-500">
                    No consented Trivia leads yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      </div>

      <section
        className="card overflow-hidden"
        aria-labelledby="trivia-fulfillment-heading"
      >
        <div className="card-header">
          <div>
            <h3 id="trivia-fulfillment-heading" className="card-title">
              Winners &amp; prize fulfillment
            </h3>
            <p className="text-xs text-slate-500">
              One row per winner × prize tier. Mark <strong>Sent</strong> once
              the prize is paid out — the winner then receives the in-app
              fulfillment prompt. <strong>Fulfilled</strong> closes the loop.
              Cash/airtime payouts use the consented lead MoMo number.
            </p>
          </div>
          <span className="badge badge-blue">
            {fulfillments.filter((item) => item.prize_status === "pending").length}{" "}
            to send ·{" "}
            {fulfillments.filter((item) => item.prize_status === "fulfilled").length}{" "}
            fulfilled
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="p-3">Tier</th>
                <th className="p-3">Prize</th>
                <th className="p-3">Winner</th>
                <th className="p-3">Consented lead</th>
                <th className="p-3">Prize status</th>
                <th className="p-3">Fulfillment prompt</th>
                <th className="p-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {fulfillments.map((item) => {
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
                  <tr key={item.id} className="border-b">
                    <td className="p-3 font-medium">{item.tier_label}</td>
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
                      <code className="text-xs">
                        {submission?.user_id
                          ? shortId(submission.user_id)
                          : "Guest"}
                      </code>
                    </td>
                    <td className="p-3">
                      {lead?.mobile ?? (
                        <span className="text-xs text-slate-500">
                          No consented lead
                        </span>
                      )}
                    </td>
                    <td className="p-3">{status(item.prize_status)}</td>
                    <td className="p-3 text-xs text-slate-500">
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
              {!fulfillments.length && (
                <tr>
                  <td colSpan={7} className="p-4 text-slate-500">
                    No prize fulfillment entries yet. Winners appear here once
                    a finished event's prize tiers are recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section
          className="card overflow-hidden"
          aria-labelledby="trivia-blocked-heading"
        >
          <div className="card-header">
            <div>
              <h3 id="trivia-blocked-heading" className="card-title">
                Blocked devices &amp; users
              </h3>
              <p className="text-xs text-slate-500">
                Privacy-hashed identifiers only — never raw device tokens or
                phone numbers. Active blocks are rejected on submit.
              </p>
            </div>
            <span className="badge badge-red">
              {activeBlocks.length} active
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
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
                      <code className="text-xs">{shortId(item.device_hash)}</code>
                    </td>
                    <td className="p-3">
                      <code className="text-xs">
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

        <section
          className="card overflow-hidden"
          aria-labelledby="trivia-rules-heading"
        >
          <div className="card-header">
            <div>
              <h3 id="trivia-rules-heading" className="card-title">
                Trivia rules settings
              </h3>
              <p className="text-xs text-slate-500">
                Every change is audit-logged. The per-device question shuffle
                keeps scoring question-ID based.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="p-3">Rule</th>
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
                      <div className="text-xs text-slate-500">
                        {rule.description}
                      </div>
                    </td>
                    <td className="p-3">
                      <code className="text-xs">{rule.value}</code>
                    </td>
                    <td className="p-3 text-xs">{rule.enforced_by}</td>
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
                    <td colSpan={4} className="p-4 text-slate-500">
                      No Trivia rules configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
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
  mutate: (body: any, message: string) => Promise<void>;
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
            onClick={() =>
              bulkStatus(
                allIds,
                "published",
                "All questions in this batch marked ready.",
              )
            }
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
            className="rounded-lg border border-slate-200 p-3"
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
                  <span className="text-xs text-slate-500">
                    validation: {question.validation_status}
                  </span>
                  {question.position != null && (
                    <span className="text-xs text-slate-400">
                      #{question.position}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium">{question.question}</p>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                  {(question.options ?? []).map(
                    (option: string, index: number) => (
                      <li
                        key={index}
                        className={cn(
                          index === question.correct_option &&
                            "font-semibold text-emerald-700",
                        )}
                      >
                        {String.fromCharCode(65 + index)}. {option}
                        {index === question.correct_option ? " ✓" : ""}
                      </li>
                    ),
                  )}
                </ul>
                {question.explanation && (
                  <p className="mt-1 text-xs text-slate-500">
                    {question.explanation}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        {!questions.length && (
          <p className="text-sm text-slate-500">
            This batch has no questions.
          </p>
        )}
      </div>
    </Modal>
  );
}
