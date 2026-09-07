"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  useAiMappings,
  useAnatomyDrugLinks,
  useBodyParts,
  useDecideAiMapping,
  useLinkDrugToBodyPart,
  useRunAiMap,
  useUnlinkDrugFromBodyPart,
  type AiMappingRow,
} from "@/features/anatomy/data/useAnatomy";
import { useDebounce } from "@/hooks/use-debounce";
import { useDrugs, type DrugRow } from "@/features/medication-reminder/data/useDrugs";
import { cn } from "@/lib/utils";

const inputCls =
  "h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white";
const labelCls =
  "text-2xs font-black uppercase tracking-widest text-slate-500 mb-1 block";

const AVAILABILITY_BADGE: Record<string, { cls: string; label: string }> = {
  otc: { cls: "badge-green", label: "OTC" },
  rx_only: { cls: "badge-amber", label: "Rx Only" },
  controlled: { cls: "badge-red", label: "Controlled" },
  unknown: { cls: "badge-slate", label: "Unknown" },
};

const confidenceBadge = (confidence: number) => {
  if (confidence >= 0.8) return "badge-green";
  if (confidence >= 0.6) return "badge-amber";
  return "badge-red";
};

function DrugOption({ drug }: { drug: DrugRow }) {
  const availability = AVAILABILITY_BADGE[drug.availability] ?? AVAILABILITY_BADGE.unknown;
  return (
    <div>
      <div className="font-bold text-slate-800">{drug.name}</div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-2xs text-slate-400">
        {drug.generic_name && <span>{drug.generic_name}</span>}
        {drug.category && <span className="badge badge-blue">{drug.category}</span>}
        <span className={cn("badge", availability.cls)}>{availability.label}</span>
      </div>
    </div>
  );
}

export default function DrugsLinkedTab() {
  const [bodyPartId, setBodyPartId] = useState("");
  const [drugSearch, setDrugSearch] = useState("");
  const [selectedDrugId, setSelectedDrugId] = useState("");
  const [linkSearch, setLinkSearch] = useState("");
  const [reviewStatus, setReviewStatus] =
    useState<"proposed" | "approved" | "rejected">("proposed");
  const [batchSize, setBatchSize] = useState(10);

  const debouncedDrugSearch = useDebounce(drugSearch, 350);
  const debouncedLinkSearch = useDebounce(linkSearch, 350);

  const { data: parts } = useBodyParts("all");
  const { data: drugResults, isLoading: drugsLoading } = useDrugs({
    search: debouncedDrugSearch || undefined,
    status: "active",
    limit: 8,
  });
  const { data: linkData, isLoading: linksLoading } = useAnatomyDrugLinks({
    search: debouncedLinkSearch || undefined,
    bodyPartId: bodyPartId || undefined,
  });
  const { data: reviewData, isLoading: reviewLoading } = useAiMappings(
    reviewStatus,
    "drug",
  );

  const linkDrug = useLinkDrugToBodyPart();
  const unlinkDrug = useUnlinkDrugFromBodyPart();
  const decide = useDecideAiMapping();
  const runAi = useRunAiMap();

  const bodyPartOptions = useMemo(
    () => (parts?.parts ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [parts],
  );
  const drugOptions = drugResults?.drugs ?? [];
  const selectedDrug = drugOptions.find((drug) => drug.id === selectedDrugId);
  const links = linkData?.links ?? [];
  const mappings = reviewData?.mappings ?? [];

  const canLink = !!bodyPartId && !!selectedDrugId && !linkDrug.isPending;

  const approveOne = (row: AiMappingRow) =>
    decide.mutate({ ids: [row.id], decision: "approved" });
  const rejectOne = (row: AiMappingRow) =>
    decide.mutate({ ids: [row.id], decision: "rejected" });

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="section-heading">
              💊 Linked Drugs
            </h3>
            <p className="mt-1 max-w-2xl text-xs text-slate-400">
              Curate which catalog drugs are relevant to each body part. Only
              published links here are exposed to the mobile anatomy dialog.
            </p>
          </div>
          <Link
            href="/medication-reminder?tab=database"
            className="btn btn-secondary btn-sm"
          >
            Open Drug Database →
          </Link>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.3fr_auto]">
          <div>
            <label className={labelCls}>Body Part</label>
            <select
              className={`${inputCls} w-full`}
              value={bodyPartId}
              onChange={(e) => setBodyPartId(e.target.value)}
            >
              <option value="">Select body part…</option>
              {bodyPartOptions.map((part) => (
                <option key={part.id} value={part.id}>
                  {part.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Active Drug</label>
            <input
              className={`${inputCls} w-full`}
              value={drugSearch}
              onChange={(e) => {
                setDrugSearch(e.target.value);
                setSelectedDrugId("");
              }}
              placeholder="Search drug, generic name or category…"
            />
            {debouncedDrugSearch.length >= 2 && (
              <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-white shadow-sm">
                {drugsLoading ? (
                  <div className="px-3 py-4 text-xs text-slate-400">Searching drugs…</div>
                ) : drugOptions.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-slate-400">No active drugs found.</div>
                ) : (
                  drugOptions.map((drug) => (
                    <button
                      key={drug.id}
                      className={cn(
                        "block w-full border-b border-slate-50 px-3 py-2 text-left text-xs hover:bg-emerald-50",
                        selectedDrugId === drug.id && "bg-emerald-50",
                      )}
                      onClick={() => {
                        setSelectedDrugId(drug.id);
                        setDrugSearch(drug.name);
                      }}
                    >
                      <DrugOption drug={drug} />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex items-end">
            <button
              className="btn btn-primary btn-sm h-9 w-full disabled:opacity-50 lg:w-auto"
              disabled={!canLink}
              onClick={() =>
                linkDrug.mutate({
                  bodyPartId,
                  drugId: selectedDrugId,
                })
              }
            >
              {linkDrug.isPending ? "Linking…" : "+ Link Drug"}
            </button>
          </div>
        </div>

        {selectedDrug && (
          <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-900">
            Ready to link <strong>{selectedDrug.name}</strong>
            {selectedDrug.generic_name ? ` (${selectedDrug.generic_name})` : ""}.
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-4">
          <h3 className="section-heading">
            Published Drug Links
          </h3>
          <span className="badge badge-green">{links.length} links</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              className={`${inputCls} w-60`}
              placeholder="Search drug, generic or body part…"
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-2xs font-black uppercase tracking-widest text-slate-400">
                <th className="px-5 py-3">Body Part</th>
                <th className="px-5 py-3">Drug</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Availability</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {linksLoading && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    Loading drug links…
                  </td>
                </tr>
              )}
              {!linksLoading && links.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    No drugs are linked to body parts yet.
                  </td>
                </tr>
              )}
              {!linksLoading &&
                links.map((row) => {
                  const availability =
                    AVAILABILITY_BADGE[row.availability ?? "unknown"] ??
                    AVAILABILITY_BADGE.unknown;
                  return (
                    <tr
                      key={`${row.drug_id}-${row.body_part_id}`}
                      className="border-b border-slate-50 hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-3 font-bold text-slate-800">
                        {row.body_part_name}
                        {row.body_system && (
                          <div className="text-2xs font-medium text-slate-400">
                            {row.body_system}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-800">{row.drug_name}</div>
                        <div className="text-2xs text-slate-400">
                          {[
                            row.generic_name,
                            row.strength
                              ? `${row.strength}${row.strength_unit ?? ""}`
                              : null,
                            row.dosage_form,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="badge badge-blue">{row.category || "Other"}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn("badge", availability.cls)}>
                          {availability.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={
                            row.status === "active" ? "badge badge-green" : "badge badge-slate"
                          }
                        >
                          {row.status || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={unlinkDrug.isPending}
                          onClick={() =>
                            unlinkDrug.mutate({
                              drugId: row.drug_id,
                              bodyPartId: row.body_part_id,
                            })
                          }
                        >
                          Unlink
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="section-heading">
              AI Drug Mapping Review
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Suggestions stay private until an admin approves them.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              Batch
              <input
                className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                min={1}
                max={25}
                type="number"
                value={batchSize}
                onChange={(e) =>
                  setBatchSize(Math.max(1, Math.min(25, Number(e.target.value) || 10)))
                }
              />
            </label>
            <button
              className="btn btn-secondary btn-sm"
              disabled={runAi.isPending}
              onClick={() =>
                runAi.mutate({
                  content_type: "drug",
                  unmapped_only: true,
                  batch_size: batchSize,
                })
              }
            >
              {runAi.isPending ? "Analyzing…" : "Propose Drug Links"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(["proposed", "approved", "rejected"] as const).map((status) => (
            <button
              key={status}
              className={`btn btn-sm ${reviewStatus === status ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setReviewStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>

        {reviewLoading ? (
          <p className="py-10 text-center text-xs text-slate-400">Loading suggestions…</p>
        ) : mappings.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-400">
            No {reviewStatus} drug suggestions.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-2xs font-black uppercase tracking-widest text-slate-400">
                  <th className="py-2 pr-3">Drug</th>
                  <th className="py-2 pr-3">Body Part</th>
                  <th className="py-2 pr-3">Confidence</th>
                  <th className="py-2 pr-3">Rationale</th>
                  {reviewStatus === "proposed" && <th className="py-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {mappings.map((mapping) => (
                  <tr key={mapping.id} className="border-b border-slate-50 align-top">
                    <td className="max-w-[260px] py-2.5 pr-3 font-bold text-slate-700">
                      {mapping.content_name}
                    </td>
                    <td className="py-2.5 pr-3 font-semibold text-slate-600">
                      {mapping.body_parts?.name ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={cn("badge", confidenceBadge(Number(mapping.confidence)))}>
                        {Math.round(Number(mapping.confidence) * 100)}%
                      </span>
                    </td>
                    <td className="max-w-[360px] py-2.5 pr-3 text-slate-400">
                      {mapping.rationale ?? "—"}
                    </td>
                    {reviewStatus === "proposed" && (
                      <td className="py-2.5">
                        <div className="flex gap-1.5">
                          <button
                            className="btn btn-sm btn-primary"
                            disabled={decide.isPending}
                            onClick={() => approveOne(mapping)}
                          >
                            ✓ Approve
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            disabled={decide.isPending}
                            onClick={() => rejectOne(mapping)}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
