"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getBrowserClient } from "@/lib/db/browser";
import {
  useAnatomyOverview,
  useBodyParts,
  useUpdateBodyPartGenderScope,
} from "@/features/anatomy/data/useAnatomy";

// Tab 5 — Connected Modules: live head-count cards into every module that
// consumes the body-part taxonomy, plus suggested connections and the
// gender-aware content rules editor (writes body_parts.gender_scope).

const headCount = async (table: string): Promise<number> => {
  const supabase = getBrowserClient();
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) return -1;
  return count ?? 0;
};

interface ModuleCard {
  icon: string;
  title: string;
  table: string;
  href: string;
  detail: string;
  /** Read the count from get_anatomy_overview_stats() instead of a head count. */
  statKey?: "condition_links" | "symptom_links" | "healthy_tip_links" | "hotspots";
}

const MODULE_CARDS: ModuleCard[] = [
  {
    icon: "🦠",
    title: "Diseases & Conditions",
    table: "conditions",
    href: "/diseases",
    detail: "condition_body_parts junction · specialist routing",
  },
  {
    icon: "🩺",
    title: "Symptoms",
    table: "symptoms",
    href: "/symptoms",
    detail: "symptom_body_parts junction · get_body_part_stats RPC",
  },
  {
    icon: "🥗",
    title: "Healthy Living",
    // healthy_living_body_parts is RLS-locked to the browser client, so the
    // count comes from get_anatomy_overview_stats() (SECURITY DEFINER) instead
    // of a head count.
    table: "healthy_living_body_parts",
    statKey: "healthy_tip_links" as const,
    href: "/healthy-living",
    detail: "healthy_living_body_parts junction · surfaced in Body Map detail panel",
  },
  {
    icon: "💪",
    title: "Fitness",
    table: "fitness_body_parts",
    href: "/anatomy?tab=exercises",
    detail: "fitness_body_parts junction · primary_muscle_group → body parts",
  },
  {
    icon: "💊",
    title: "Medications",
    // Under-reports: RLS scopes `drugs` to the caller, so this counts 2,633 of
    // 3,530. A head count is the wrong instrument for an admin total on any
    // row-scoped table — see docs/cleanup-handoff.md (E1.3).
    table: "drugs",
    href: "/medication-reminder?tab=database",
    detail: "drug catalog categories · interaction checker",
  },
  {
    icon: "🧑‍⚕️",
    title: "Specialist / HCP",
    // Was `hcp_profiles`, which does not exist — the head count errored and the
    // card read "Not available" permanently. The /hcp page reads
    // hcp_verifications. Note RLS scopes it to the caller's own rows, so this
    // is 0 today because the table is empty, not because it is readable.
    table: "hcp_verifications",
    href: "/hcp",
    detail: "specialist matching via conditions.specialist",
  },
  {
    icon: "🏥",
    title: "Nearby Facilities",
    // Was `facilities`, which does not exist. The table is facility_profile
    // (21 other call sites agree); authenticated sees all 3 rows.
    table: "facility_profile",
    href: "/facilities",
    detail: "GPS-based facility discovery by specialism",
  },
];

const SUGGESTED = [
  { icon: "🥦", label: "Nutrition", note: "diet plans by affected body part" },
  { icon: "🧪", label: "Labs", note: "test panels by body system" },
  { icon: "📅", label: "Period Tracker", note: "reproductive system linkage" },
  { icon: "🤖", label: "AI Chat", note: "body-part context injection" },
  { icon: "🏪", label: "IBP Businesses", note: "verified pharmacies by region" },
];

function GenderRulesEditor() {
  const [bodyPartId, setBodyPartId] = useState("");
  const { data: parts } = useBodyParts("all");
  const updateScope = useUpdateBodyPartGenderScope();

  const sorted = (parts?.parts ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const selected = sorted.find((p) => p.id === bodyPartId);

  return (
    <div className="card p-5">
      <h4 className="text-sm font-black uppercase tracking-widest text-slate-700">
        ⚧ Gender-Aware Content Rules
      </h4>
      <p className="mt-1 text-xs text-slate-500">
        Controls which gender variant(s) the mobile app shows each body part for. Female scope
        adds breasts & reproductive organs to the Body Map.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          className="h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white"
          value={bodyPartId}
          onChange={(e) => setBodyPartId(e.target.value)}
        >
          <option value="">Select body part…</option>
          {sorted.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.gender_scope || "unspecified"})
            </option>
          ))}
        </select>

        {(["shared", "female", "male", "unspecified"] as const).map((scope) => (
          <button
            key={scope}
            className={`btn btn-sm ${
              selected?.gender_scope === scope ? "btn-primary" : "btn-secondary"
            } disabled:opacity-50`}
            disabled={!selected || updateScope.isPending}
            onClick={() =>
              selected && updateScope.mutate({ id: selected.id, genderScope: scope })
            }
          >
            {scope}
          </button>
        ))}
      </div>

      {selected && (
        <p className="mt-2 text-[11px] text-slate-400">
          Current scope for <strong>{selected.name}</strong>:{" "}
          <span className="badge badge-blue">{selected.gender_scope || "unspecified"}</span>
        </p>
      )}
    </div>
  );
}

export default function ConnectedModulesTab() {
  const { data: overview } = useAnatomyOverview();
  const counts = useQuery({
    queryKey: ["anatomy-connected-counts"],
    queryFn: async () => {
      const headCounted = MODULE_CARDS.filter((card) => !card.statKey);
      const entries = await Promise.all(
        headCounted.map(async (card) => [card.table, await headCount(card.table)] as const),
      );
      return Object.fromEntries(entries) as Record<string, number>;
    },
    staleTime: 1000 * 60 * 2,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MODULE_CARDS.map((card) => {
          const count = card.statKey
            ? overview?.stats?.[card.statKey]
            : counts.data?.[card.table];
          return (
            <Link key={card.title} href={card.href} className="card block p-5 transition hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="text-2xl">{card.icon}</div>
                <span
                  className={
                    count === undefined
                      ? "badge badge-slate"
                      : count === -1
                        ? "badge badge-red"
                        : "badge badge-green"
                  }
                >
                  {count === undefined ? "…" : count === -1 ? "Not available" : count.toLocaleString()}
                </span>
              </div>
              <h4 className="mt-3 text-sm font-black uppercase tracking-widest text-slate-700">
                {card.title}
              </h4>
              <p className="mt-1 text-[11px] text-slate-500">{card.detail}</p>
              <span className="mt-2 inline-block text-[11px] font-bold text-emerald-700">
                Open module →
              </span>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-700">
            💡 Suggested Connections
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            Modules not yet wired to the body-part taxonomy — roadmap mapping work.
          </p>
          <ul className="mt-3 space-y-2">
            {SUGGESTED.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-xs">
                <span className="text-base">{item.icon}</span>
                <span className="font-bold text-slate-700">{item.label}</span>
                <span className="text-slate-400">— {item.note}</span>
              </li>
            ))}
          </ul>
        </div>

        <GenderRulesEditor />
      </div>
    </div>
  );
}
