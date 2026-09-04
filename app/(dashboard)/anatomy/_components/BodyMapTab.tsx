"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  useAnatomyConditions,
  useAnatomyHotspots,
  useAnatomySymptoms,
  useAnatomyTips,
  useBodyParts,
  type AnatomyBodyPart,
} from "@/hooks/supabase-calls/useAnatomy";
import { BODY_SYSTEMS } from "./AddBodyPartDialog";

const SYSTEM_LABELS: Record<string, string> = {
  general: "🧍 General",
  cardiovascular: "❤️ Cardiovascular",
  digestive: "🫄 Digestive",
  respiratory: "🫁 Respiratory",
  nervous: "🧠 Nervous",
  skeletal: "🦴 Skeletal",
  muscular: "💪 Muscular",
  urinary: "🫘 Urinary",
  reproductive: "🧬 Reproductive",
};

// Simple front/back human silhouette used behind the data-driven hotspot layer.
const SILHOUETTE_PATH =
  "M100 22c-13 0-22 10-22 23 0 8 3 14 8 18-13 4-22 12-24 24l-8 52c-1 8 3 12 9 13 6 1 9-3 10-9l7-40v35l-6 78c-1 9-4 60-4 70 0 8 4 12 10 12s9-4 10-11l7-68h6l7 68c1 7 3 11 10 11s10-4 10-12c0-10-3-61-4-70l-6-78v-35l7 40c1 6 4 10 10 9 6-1 10-5 9-13l-8-52c-2-12-11-20-24-24 5-4 8-10 8-18 0-13-9-23-22-23z";

export default function BodyMapTab({ gender }: { gender: "female" | "male" }) {
  const [system, setSystem] = useState<string>("general");
  const [view, setView] = useState<"front" | "back">("front");
  const [showOrgans, setShowOrgans] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: partsData, isLoading } = useBodyParts(system);
  const { data: hotspots } = useAnatomyHotspots();

  const parts = partsData?.parts ?? [];

  useEffect(() => {
    setSelectedId(null);
  }, [system, view, gender]);

  const selected: AnatomyBodyPart | undefined = useMemo(
    () => parts.find((p) => p.id === selectedId),
    [parts, selectedId],
  );

  // Hotspots for the active gender + view; organs hidden unless toggled.
  const visibleHotspots = useMemo(
    () =>
      (hotspots ?? []).filter(
        (h) =>
          h.view === view &&
          (h.gender === "shared" || h.gender === gender) &&
          (showOrgans || !h.is_organ),
      ),
    [hotspots, view, gender, showOrgans],
  );

  const partById = useMemo(() => {
    const map = new Map<string, AnatomyBodyPart>();
    parts.forEach((p) => map.set(p.id, p));
    return map;
  }, [parts]);

  const quickTags = useMemo(() => parts.slice(0, 15), [parts]);

  const { data: conditions } = useAnatomyConditions({ bodyPartId: selectedId ?? undefined });
  const { data: symptoms } = useAnatomySymptoms({ bodyPartId: selectedId ?? undefined });
  const { data: tips } = useAnatomyTips(selectedId ?? undefined);

  return (
    <div className="space-y-4">
      {/* System sub-tabs + toggles */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-full bg-slate-100 p-1">
            {BODY_SYSTEMS.map((s) => (
              <button
                key={s}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                  system === s
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-white"
                }`}
                onClick={() => setSystem(s)}
              >
                {SYSTEM_LABELS[s]}
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex rounded-full bg-slate-100 p-1">
              <button
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                  view === "front"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-white"
                }`}
                onClick={() => setView("front")}
              >
                Front
              </button>
              <button
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                  view === "back"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-white"
                }`}
                onClick={() => setView("back")}
              >
                Back
              </button>
            </div>
            <button
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                showOrgans
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
              onClick={() => setShowOrgans((v) => !v)}
            >
              🔬 {showOrgans ? "Hide Organs" : "Show Organs"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Map / region cards */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">
              🪴 Body Map — {SYSTEM_LABELS[system]} · {view} · {gender}
            </h3>
            <span className="badge badge-blue">{parts.length} regions</span>
          </div>

          {visibleHotspots.length > 0 ? (
            <div className="mt-4 flex justify-center rounded-2xl bg-linear-to-b from-slate-50 to-slate-100 py-4">
              <svg viewBox="0 0 200 400" className="h-[480px] w-auto">
                <defs>
                  <linearGradient id="bodyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f8fafc" />
                    <stop offset="100%" stopColor="#e2e8f0" />
                  </linearGradient>
                  <radialGradient id="hotspotGlow">
                    <stop offset="0%" stopColor="rgba(52,211,153,0.55)" />
                    <stop offset="100%" stopColor="rgba(52,211,153,0)" />
                  </radialGradient>
                  <filter id="bodyShadow" x="-20%" y="-10%" width="140%" height="120%">
                    <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.12" />
                  </filter>
                </defs>
                <path
                  d={SILHOUETTE_PATH}
                  fill="url(#bodyGradient)"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                  filter="url(#bodyShadow)"
                />
                {visibleHotspots.map((h) => {
                  const part = partById.get(h.body_part_id);
                  const active = selectedId === h.body_part_id;
                  return (
                    <g
                      key={h.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(h.body_part_id)}
                    >
                      <ellipse
                        cx={h.cx}
                        cy={h.cy}
                        rx={Number(h.rx) * (active ? 2.2 : 1.8)}
                        ry={Number(h.ry) * (active ? 2.2 : 1.8)}
                        fill="url(#hotspotGlow)"
                        className={active ? "opacity-100" : "opacity-0 transition-opacity group-hover:opacity-70"}
                      />
                      <ellipse
                        cx={h.cx}
                        cy={h.cy}
                        rx={h.rx}
                        ry={h.ry}
                        className="transition"
                        fill={active ? "rgba(5,150,105,0.5)" : "rgba(5,150,105,0.2)"}
                        stroke={active ? "#047857" : "#10b981"}
                        strokeWidth={active ? 2 : 1}
                      >
                        <title>{part?.name ?? "Body region"}</title>
                      </ellipse>
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <div className="mt-4">
              {isLoading ? (
                <p className="py-16 text-center text-xs text-slate-400">Loading body map…</p>
              ) : parts.length === 0 ? (
                <p className="py-16 text-center text-xs text-slate-400">
                  No body parts mapped for this system yet.
                </p>
              ) : (
                <>
                  <p className="text-[11px] text-slate-400">
                    No hotspot geometry seeded yet (anatomy_hotspots) — showing region cards.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {parts.map((part) => (
                      <button
                        key={part.id}
                        onClick={() => setSelectedId(part.id)}
                        className={`rounded-xl border p-3 text-left transition ${
                          selectedId === part.id
                            ? "border-emerald-600 bg-emerald-50"
                            : "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40"
                        }`}
                      >
                        <div className="text-lg">{part.icon || "🧍"}</div>
                        <div className="mt-1 text-xs font-bold text-slate-700">{part.name}</div>
                        <div className="mt-1 flex gap-1">
                          <span className="badge badge-blue">{part.condition_count} cond.</span>
                          <span className="badge badge-purple">{part.symptom_count} symp.</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Quick-select tags */}
          {quickTags.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Quick select
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {quickTags.map((part) => (
                  <button
                    key={part.id}
                    onClick={() => setSelectedId(part.id)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                      selectedId === part.id
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-200 text-slate-600 hover:border-emerald-400"
                    }`}
                  >
                    {part.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detail side panel */}
        <div className="card p-5">
          {!selected ? (
            <p className="py-16 text-center text-xs text-slate-400">
              Select a region on the map to view linked content.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="text-3xl">{selected.icon || "🧍"}</div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">
                    {selected.name}
                  </h4>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="badge badge-blue">{selected.body_system}</span>
                    <span className="badge badge-slate">{selected.gender_scope || "unspecified"}</span>
                  </div>
                </div>
              </div>

              {selected.description && (
                <p className="text-xs leading-relaxed text-slate-500">{selected.description}</p>
              )}

              <div className="flex gap-2">
                <span className="badge badge-purple">{selected.symptom_count} symptoms</span>
                <span className="badge badge-green">{selected.condition_count} conditions</span>
                <span className="badge badge-amber">{(tips ?? []).length} tips</span>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Linked conditions
                </p>
                <ul className="mt-1 space-y-1 text-xs">
                  {(conditions ?? []).slice(0, 5).map((c) => (
                    <li key={c.condition_id}>
                      <Link
                        href={`/diseases?id=${c.condition_id}`}
                        className="text-emerald-700 hover:underline"
                      >
                        {c.condition_name}
                      </Link>
                    </li>
                  ))}
                  {(conditions ?? []).length === 0 && (
                    <li className="text-slate-400">None linked</li>
                  )}
                </ul>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Linked symptoms
                </p>
                <ul className="mt-1 space-y-1 text-xs">
                  {(symptoms ?? []).slice(0, 5).map((s) => (
                    <li key={s.symptom_id}>
                      <Link
                        href={`/symptoms?id=${s.symptom_id}`}
                        className="text-emerald-700 hover:underline"
                      >
                        {s.symptom_name}
                      </Link>
                    </li>
                  ))}
                  {(symptoms ?? []).length === 0 && (
                    <li className="text-slate-400">None linked</li>
                  )}
                </ul>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Healthy tips
                </p>
                <ul className="mt-1 space-y-1 text-xs">
                  {(tips ?? []).slice(0, 5).map((t) => (
                    <li key={t.tip_id}>
                      <Link
                        href={`/healthy_living?id=${t.tip_id}`}
                        className="text-emerald-700 hover:underline"
                      >
                        {t.tip_name}
                      </Link>
                    </li>
                  ))}
                  {(tips ?? []).length === 0 && (
                    <li className="text-slate-400">None linked</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
