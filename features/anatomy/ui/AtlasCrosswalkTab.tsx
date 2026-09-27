"use client";

import React, { useMemo, useState } from "react";
import { useBodyParts } from "@/features/anatomy/data/useAnatomy";
import {
  useAtlasCrosswalk,
  useRecomputeAtlasPins,
  useUpsertAtlasMapping,
  type AtlasMapStatus,
  type AtlasSex,
} from "@/features/anatomy/data/useAtlas";

/**
 * AF-04 — Atlas Crosswalk tab.
 *
 * The join key between curated body_parts and the Human Atlas is the FMA
 * concept id. This tab is where an admin:
 *   1. sees crosswalk coverage (how many body parts resolve to real Atlas
 *      geometry per sex) — the gate for the engine cutover;
 *   2. proposes / confirms / rejects body_part <-> FMA mappings;
 *   3. recomputes the derived pins (bounds centroid) for a sex.
 *
 * Pins are DERIVED from geometry, never hand-tapped, so the 3D Pin Placement
 * tab stays the legacy-space editor while this tab owns Atlas space.
 */

const STATUS_BADGE: Record<AtlasMapStatus, string> = {
  confirmed: "badge-green",
  proposed: "badge-amber",
  rejected: "badge-red",
};

export default function AtlasCrosswalkTab({ gender }: { gender: "female" | "male" }) {
  const sex: AtlasSex = gender;
  const { data, isLoading } = useAtlasCrosswalk(sex);
  const { data: partsData } = useBodyParts("all");
  const upsert = useUpsertAtlasMapping(sex);
  const recompute = useRecomputeAtlasPins();

  const parts = useMemo(
    () => [...(partsData?.parts ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [partsData],
  );

  const [bodyPartId, setBodyPartId] = useState("");
  const [conceptId, setConceptId] = useState("");
  const [confidence, setConfidence] = useState("");

  const coverage = data?.coverage;
  const mappings = data?.mappings ?? [];
  const pins = data?.pins ?? [];

  const saveMapping = (status: AtlasMapStatus) => {
    if (!bodyPartId || !conceptId.trim()) return;
    upsert.mutate(
      {
        body_part_id: bodyPartId,
        fma_concept_id: conceptId.trim(),
        sex,
        confidence: confidence === "" ? null : Number(confidence),
        source: "manual",
        status,
      },
      {
        onSuccess: () => {
          setBodyPartId("");
          setConceptId("");
          setConfidence("");
        },
      },
    );
  };

  const setStatus = (
    row: (typeof mappings)[number],
    status: AtlasMapStatus,
  ) => {
    upsert.mutate({
      body_part_id: row.body_part_id,
      fma_concept_id: row.fma_concept_id,
      sex: row.sex,
      confidence: row.confidence,
      source: row.source,
      status,
    });
  };

  return (
    <div className="space-y-4">
      {!data?.applied && data && (
        <div className="alert al-wa">
          <div className="al-ic">⚠️</div>
          <div className="flex-1 text-xs">
            <strong>AF-04 migration not applied.</strong> The Atlas crosswalk
            tables/RPCs are missing, so coverage and pins read empty. Apply{" "}
            <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 font-mono">
              20260926130000_af04_atlas_crosswalk_pins.sql
            </code>{" "}
            then load an atlas via the import harness.
          </div>
        </div>
      )}

      {/* Coverage */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h3 className="section-heading">🧬 Crosswalk coverage</h3>
          <span className="badge badge-blue">
            {coverage?.total_body_parts ?? "…"} body parts
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(coverage?.by_sex ?? []).map((s) => (
            <React.Fragment key={s.sex}>
              <CoverageStat label={`${s.sex} · mapped`} value={s.mapped_body_parts} />
              <CoverageStat label={`${s.sex} · confirmed`} value={s.confirmed_mappings} />
              <CoverageStat label={`${s.sex} · pins`} value={s.resolved_pins} />
            </React.Fragment>
          ))}
          {!coverage && (
            <p className="col-span-full text-xs text-slate-400">
              {isLoading ? "Loading coverage…" : "No coverage data."}
            </p>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="btn btn-sm btn-primary"
            disabled={recompute.isPending}
            onClick={() => recompute.mutate(sex)}
          >
            {recompute.isPending ? "Recomputing…" : `♻ Recompute ${sex} pins`}
          </button>
          <p className="self-center text-2xs text-slate-400">
            Derived from the bounds centroid of every confirmed mapping&apos;s
            Atlas parts. Requires an atlas loaded for {sex}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Add mapping */}
        <div className="card p-5">
          <p className="text-2xs font-black uppercase tracking-widest text-slate-400">
            Map a body part → FMA concept ({sex})
          </p>
          <select
            className="btn btn-sm btn-secondary mt-2 w-full"
            value={bodyPartId}
            onChange={(e) => setBodyPartId(e.target.value)}
          >
            <option value="">Select body part…</option>
            {parts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.body_system ? ` (${p.body_system})` : ""}
              </option>
            ))}
          </select>
          <input
            className="form-input mt-2 w-full"
            placeholder="FMA concept id (e.g. FMA:7169)"
            value={conceptId}
            onChange={(e) => setConceptId(e.target.value)}
          />
          <input
            className="form-input mt-2 w-full"
            placeholder="Confidence 0–1 (optional)"
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={confidence}
            onChange={(e) => setConfidence(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <button
              className="btn btn-sm btn-primary"
              disabled={!bodyPartId || !conceptId.trim() || upsert.isPending}
              onClick={() => saveMapping("confirmed")}
            >
              Confirm mapping
            </button>
            <button
              className="btn btn-sm btn-secondary"
              disabled={!bodyPartId || !conceptId.trim() || upsert.isPending}
              onClick={() => saveMapping("proposed")}
            >
              Propose
            </button>
          </div>
        </div>

        {/* Resolved pins */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-2xs font-black uppercase tracking-widest text-slate-400">
              Resolved Atlas pins ({sex})
            </p>
            <span className="badge badge-blue">{pins.length}</span>
          </div>
          <ul className="mt-2 max-h-[280px] space-y-1.5 overflow-y-auto">
            {pins.map((p) => (
              <li
                key={p.body_part_id}
                className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {p.name}
                  </p>
                  <p className="text-2xs text-slate-400">
                    ({p.x.toFixed(3)}, {p.y.toFixed(3)}, {p.z.toFixed(3)}) m ·{" "}
                    {p.source}
                  </p>
                </div>
              </li>
            ))}
            {pins.length === 0 && (
              <li className="py-4 text-center text-xs text-slate-400">
                No resolved pins yet — confirm mappings then recompute.
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Mappings table */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <p className="text-2xs font-black uppercase tracking-widest text-slate-400">
            Mappings
          </p>
          <span className="badge badge-blue">{mappings.length}</span>
        </div>
        <ul className="mt-2 max-h-[360px] space-y-1.5 overflow-y-auto">
          {mappings.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2"
            >
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {m.body_parts?.name ?? m.body_part_id}{" "}
                  <span className="text-slate-400">→</span> {m.fma_concept_id}
                </p>
                <p className="text-2xs text-slate-400">
                  {m.sex} · {m.source}
                  {m.confidence !== null ? ` · conf ${Number(m.confidence).toFixed(2)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${STATUS_BADGE[m.status]}`}>{m.status}</span>
                {m.status !== "confirmed" && (
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={upsert.isPending}
                    onClick={() => setStatus(m, "confirmed")}
                  >
                    Confirm
                  </button>
                )}
                {m.status !== "rejected" && (
                  <button
                    className="btn btn-sm btn-secondary"
                    disabled={upsert.isPending}
                    onClick={() => setStatus(m, "rejected")}
                  >
                    Reject
                  </button>
                )}
              </div>
            </li>
          ))}
          {mappings.length === 0 && (
            <li className="py-4 text-center text-xs text-slate-400">
              No mappings yet.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function CoverageStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2">
      <p className="text-2xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-lg font-black text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}
