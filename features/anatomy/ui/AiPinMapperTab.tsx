"use client";

import React, { useState } from "react";
import {
  useAiMappings,
  useDecideAiMapping,
  useRunAiMap,
  type AiMappingRow,
} from "@/features/anatomy/data/useAnatomy";

/**
 * AI Pin Mapper (Gap Analysis Part AL, AL-D8). Runs the LLM over unmapped
 * Diseases & Conditions / Symptoms / Healthy Living / Fitness content and
 * queues body-part suggestions for human review. Approving a suggestion is
 * the only path that writes the junction row — nothing auto-publishes.
 */

const CONTENT_TYPES = [
  { value: "condition", label: "🦠 Diseases & Conditions" },
  { value: "symptom", label: "🩺 Symptoms" },
  { value: "tip", label: "🌿 Healthy Living" },
  { value: "drug", label: "💊 Drugs" },
  { value: "workout", label: "💪 Fitness" },
] as const;

const TYPE_BADGE: Record<string, string> = {
  condition: "badge-green",
  symptom: "badge-purple",
  tip: "badge-amber",
  drug: "badge-green",
  workout: "badge-blue",
};

const confidenceBadge = (c: number) => {
  if (c >= 0.8) return { cls: "badge-green", label: `${Math.round(c * 100)}% high` };
  if (c >= 0.6) return { cls: "badge-amber", label: `${Math.round(c * 100)}% medium` };
  return { cls: "badge-red", label: `${Math.round(c * 100)}% low` };
};

export default function AiPinMapperTab() {
  const [contentType, setContentType] =
    useState<(typeof CONTENT_TYPES)[number]["value"]>("condition");
  const [batchSize, setBatchSize] = useState(10);
  const [unmappedOnly, setUnmappedOnly] = useState(true);
  const [status, setStatus] = useState<"proposed" | "approved" | "rejected">(
    "proposed",
  );

  const run = useRunAiMap();
  const decide = useDecideAiMapping();
  const { data, isLoading } = useAiMappings(status, contentType);
  const mappings = data?.mappings ?? [];

  const highConfidenceIds = mappings
    .filter((m) => m.status === "proposed" && m.confidence >= 0.9)
    .map((m) => m.id);

  const decideOne = (row: AiMappingRow, decision: "approved" | "rejected") =>
    decide.mutate({ ids: [row.id], decision });

  return (
    <div className="space-y-4">
      {/* Runner */}
      <div className="card p-5">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">
          🤖 Run AI mapping
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          The model reads each article&apos;s text and proposes which body
          parts it affects, using only the platform&apos;s body-part
          vocabulary. Suggestions land in the review queue below — approval is
          always manual.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            className="btn btn-sm btn-secondary"
            value={contentType}
            onChange={(e) =>
              setContentType(e.target.value as (typeof CONTENT_TYPES)[number]["value"])
            }
          >
            {CONTENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            Batch
            <input
              type="number"
              min={1}
              max={25}
              value={batchSize}
              onChange={(e) =>
                setBatchSize(Math.max(1, Math.min(25, Number(e.target.value) || 10)))
              }
              className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={unmappedOnly}
              onChange={(e) => setUnmappedOnly(e.target.checked)}
            />
            Unmapped content only
          </label>
          <button
            className="btn btn-sm btn-primary"
            disabled={run.isPending}
            onClick={() =>
              run.mutate({
                content_type: contentType,
                unmapped_only: unmappedOnly,
                batch_size: batchSize,
              })
            }
          >
            {run.isPending ? "Analyzing…" : "▶ Run mapping"}
          </button>
        </div>
        {!data?.applied && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
            Review queue unavailable — apply the Part AL migration
            (20260823_anatomy_mobile_al.sql) first.
          </p>
        )}
      </div>

      {/* Review queue */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">
            Review queue
          </h3>
          <div className="flex items-center gap-2">
            {(["proposed", "approved", "rejected"] as const).map((s) => (
              <button
                key={s}
                className={`btn btn-sm ${status === s ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setStatus(s)}
              >
                {s}
              </button>
            ))}
            {status === "proposed" && highConfidenceIds.length > 0 && (
              <button
                className="btn btn-sm btn-secondary"
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate({ ids: highConfidenceIds, decision: "approved" })
                }
              >
                ✓ Approve all ≥90% ({highConfidenceIds.length})
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-xs text-slate-400">Loading…</p>
        ) : mappings.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-400">
            No {status} suggestions for this content type.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-400">
                  <th className="py-2 pr-3">Content</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Body part</th>
                  <th className="py-2 pr-3">Confidence</th>
                  <th className="py-2 pr-3">Rationale</th>
                  {status === "proposed" && <th className="py-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => {
                  const conf = confidenceBadge(Number(m.confidence));
                  return (
                    <tr key={m.id} className="border-b border-slate-100 align-top">
                      <td className="max-w-[220px] py-2.5 pr-3 font-bold text-slate-700">
                        {m.content_name}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`badge ${TYPE_BADGE[m.content_type]}`}>
                          {m.content_type}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-semibold text-slate-600">
                        {m.body_parts?.name ?? "—"}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`badge ${conf.cls}`}>{conf.label}</span>
                      </td>
                      <td className="max-w-[260px] py-2.5 pr-3 text-slate-400">
                        {m.rationale ?? "—"}
                      </td>
                      {status === "proposed" && (
                        <td className="py-2.5">
                          <div className="flex gap-1.5">
                            <button
                              className="btn btn-sm btn-primary"
                              disabled={decide.isPending}
                              onClick={() => decideOne(m, "approved")}
                            >
                              ✓
                            </button>
                            <button
                              className="btn btn-sm btn-secondary"
                              disabled={decide.isPending}
                              onClick={() => decideOne(m, "rejected")}
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
