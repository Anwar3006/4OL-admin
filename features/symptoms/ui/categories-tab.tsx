"use client";

/**
 * Symptoms Categories tab (Analytics/Carousels build, Phase 3).
 * Taxonomy coverage surface for categories WHERE type='symptom': per-category
 * symptom counts/views aggregated from the symptom_categories junction, an
 * uncategorised queue with deep links into the symptom editor, and the
 * Phase 4 cross-links into the Anatomy menu's Linked Symptoms tab.
 * Supports ?category= pre-selection (from Analytics bars / deep links).
 */

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import KpiCard from "@/components/redesign/KpiCard";
import { useSymptomCategoriesTab } from "@/features/symptoms/data/useSymptoms";
import { cn } from "@/lib/utils";

const SymptomCategoriesTab = () => {
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get("category");
  const { data, isLoading, isError, error } = useSymptomCategoriesTab();

  if (isLoading) {
    return (
      <div className="card py-24 text-center text-xs font-bold text-slate-400">
        Loading symptom categories…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="card py-16 text-center text-xs font-bold text-red-500">
        Failed to load categories{error ? `: ${error.message}` : "."}
      </div>
    );
  }

  const { rows, uncategorised, linkedCount } = data;
  const totalCategories = rows.length;
  const withSymptoms = rows.filter((r) => r.symptom_count > 0).length;
  const avgPerCategory = withSymptoms === 0
    ? 0
    : Math.round(linkedCount / withSymptoms);

  return (
    <div className="space-y-6">
      {/* Coverage KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon="📂"
          label="Symptom Categories"
          value={totalCategories.toLocaleString()}
          variant="purple"
          delta={`${withSymptoms} in use`}
          deltaType="neutral"
        />
        <KpiCard
          icon="🔗"
          label="Categorised Symptoms"
          value={linkedCount.toLocaleString()}
          variant="blue"
          delta="Linked via symptom_categories"
          deltaType="neutral"
        />
        <KpiCard
          icon="⚠️"
          label="Uncategorised"
          value={uncategorised.length.toLocaleString()}
          variant="amber"
          delta="Top 20 shown below"
          deltaType="neutral"
        />
        <KpiCard
          icon="📊"
          label="Avg per Category"
          value={String(avgPerCategory)}
          variant="teal"
          delta="Across in-use categories"
          deltaType="neutral"
        />
      </div>

      {/* Cross-link into Anatomy */}
      <div className="alert al-ok">
        <div className="al-ic">🧍</div>
        <div className="flex-1 text-xs">
          <strong>Anatomy linkage:</strong> every symptom in these categories
          can also carry body-part links — manage those in the Human Anatomy
          menu&apos;s <strong>Linked Symptoms</strong> tab.
        </div>
        <Link href="/anatomy?tab=symptoms" className="btn btn-secondary h-8 px-3 text-[10px] font-black uppercase tracking-widest shrink-0">
          Open Anatomy →
        </Link>
      </div>

      {/* Category table */}
      <div className="card p-0 overflow-hidden border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-700">
            Categories (type = symptom)
          </h4>
        </div>
        {rows.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400">
            No symptom categories exist yet — create categories with
            type=&apos;symptom&apos; to organise the taxonomy.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Symptoms</th>
                  <th className="px-5 py-3">Published</th>
                  <th className="px-5 py-3">Total Views</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.category_id}
                    className={cn(
                      "border-b border-slate-50 hover:bg-slate-50/60 transition-colors",
                      selectedCategory === row.category_id && "bg-emerald-50/60",
                    )}
                  >
                    <td className="px-5 py-3 font-bold text-slate-800">
                      <span style={{ paddingLeft: `${Math.max(0, row.level) * 12}px` }}>
                        {row.category_name}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="badge badge-blue">{row.symptom_count}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="badge badge-green">{row.published_count}</span>
                    </td>
                    <td className="px-5 py-3 font-black text-slate-600">
                      {row.total_views.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Uncategorised queue */}
      <div className="card p-0 overflow-hidden border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-700">
            ⚠️ Uncategorised Symptoms — assign categories to improve discovery
          </h4>
        </div>
        {uncategorised.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400">
            Every symptom is categorised. 🎉
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {uncategorised.map((row: any) => (
              <li
                key={row.id}
                className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/60 transition-colors"
              >
                <Link
                  href={`/symptoms?id=${row.id}`}
                  className="text-xs font-bold text-emerald-700 truncate flex-1 hover:underline"
                >
                  {row.name}
                </Link>
                <span
                  className={
                    row.status === "published" ? "badge badge-green" : "badge badge-slate"
                  }
                >
                  {row.status?.replace("_", " ") ?? "draft"}
                </span>
                <span className="text-[11px] font-black text-slate-600">
                  👁️ {(row.view_count ?? 0).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SymptomCategoriesTab;
