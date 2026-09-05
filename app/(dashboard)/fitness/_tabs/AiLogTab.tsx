"use client";

import React, { useMemo, useState } from "react";
import {
  useFitnessAiLogStats,
  type FitnessAiCallRow,
} from "@/hooks/supabase-calls/useFitnessAnalytics";
import { useAiGeneratePlanDialog } from "@/stores/dialog-store";
import AiGeneratePlanDialog from "../_components/ai-generate-plan-dialog";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";

/**
 * AI Log tab (Gap Analysis Part V, tab 9). Read-side cost/usage audit over
 * fitness_ai_calls via get_fitness_ai_log_stats.
 * V-D1: monthly budget is a constant until a settings row is added — kept
 * here (not hard-coded in SQL) so super_admin can change it in one place.
 * V-D4: Retry is gated behind a confirmation because it re-runs generation
 * against the live provider (cost incurred); it opens the admin AI plan
 * dialog since fitness_ai_calls stores no replayable selections.
 */

const MONTHLY_BUDGET_USD = 20;

const STATUS_FILTERS = ["all", "success", "error", "timeout"] as const;

const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const AiLogTab = () => {
  const [periodDays, setPeriodDays] = useState(30);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [modelFilter, setModelFilter] = useState("");
  const aiGenerateDialog = useAiGeneratePlanDialog();

  const { data, isLoading, isError } = useFitnessAiLogStats(periodDays);

  const totals = data?.totals;
  const models = data?.by_model ?? [];
  const recent = data?.recent ?? [];

  const modelOptions = useMemo(
    () => models.map((m) => m.model_name),
    [models],
  );

  const filtered = useMemo(
    () =>
      recent.filter(
        (row) =>
          (statusFilter === "all" || row.status === statusFilter) &&
          (!modelFilter || row.model_name === modelFilter),
      ),
    [recent, statusFilter, modelFilter],
  );

  const budgetUsed = totals?.estimated_cost ?? 0;
  const budgetPct = Math.min(100, Math.round((budgetUsed / MONTHLY_BUDGET_USD) * 100));

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.error("Nothing to export for the current filters.");
      return;
    }
    downloadCsv(
      filtered.map((row) => ({
        Date: row.created_at,
        User: row.user_name || row.user_id || "",
        Model: row.model_name,
        Status: row.status,
        Tokens: row.token_usage ?? 0,
        Cost: row.estimated_cost ?? 0,
        "Latency (ms)": row.response_time_ms ?? "",
        Error: row.error_message || "",
      })),
      "fitness-ai-log",
    );
    toast.success(`Exported ${filtered.length} AI calls.`);
  };

  const handleRetry = (row: FitnessAiCallRow) => {
    if (
      !globalThis.confirm(
        "Retry runs a new generation against the live AI provider and will incur cost (~$0.04–0.08). Continue?",
      )
    ) {
      return;
    }
    // The original selections are not stored on fitness_ai_calls, so retry
    // opens the admin generation dialog pre-flow rather than replaying.
    aiGenerateDialog.open();
    toast.info(`Retrying via AI plan generation (${row.model_name}).`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Budget + KPI strip */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="card lg:col-span-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Monthly AI Budget
          </div>
          <div className="text-2xl font-black text-slate-800">
            ${budgetUsed.toFixed(2)}
            <span className="text-sm font-bold text-slate-400"> / ${MONTHLY_BUDGET_USD}</span>
          </div>
          <div className="mt-2 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${budgetPct > 80 ? "bg-red-500" : "bg-emerald-500"}`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] font-bold text-slate-400">
            {budgetPct}% used · last {periodDays} days
          </div>
        </div>

        {[
          { label: "Total Calls", value: totals?.calls, color: "text-blue-600", icon: "📞" },
          { label: "Successful", value: totals?.success, color: "text-emerald-700", icon: "✅" },
          { label: "Failed", value: totals?.errors, color: "text-red-600", icon: "⚠️" },
          { label: "Total Tokens", value: totals?.tokens, color: "text-purple-600", icon: "🧩" },
        ].map((kpi) => (
          <div key={kpi.label} className="card">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
              {kpi.icon} {kpi.label}
            </div>
            <div className={`text-2xl font-black ${kpi.color}`}>
              {isLoading ? "..." : (kpi.value ?? 0).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Cost breakdown chips by model */}
      <div className="flex flex-wrap gap-2">
        {models.map((model) => (
          <div
            key={model.model_name}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-600"
          >
            <span className="font-black text-slate-800">{model.model_name}</span>
            <span className="text-slate-400">·</span>
            <span>{model.calls.toLocaleString()} calls</span>
            <span className="text-slate-400">·</span>
            <span className="text-emerald-700">${Number(model.estimated_cost).toFixed(2)}</span>
          </div>
        ))}
        {!isLoading && models.length === 0 && (
          <div className="text-xs font-semibold text-slate-400">No AI calls in this period.</div>
        )}
      </div>

      {/* Filters + export */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-[10px] font-bold uppercase tracking-widest text-slate-600 outline-none"
          value={periodDays}
          onChange={(e) => setPeriodDays(Number(e.target.value))}
          aria-label="Period"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        <select
          className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-[10px] font-bold uppercase tracking-widest text-slate-600 outline-none"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as (typeof STATUS_FILTERS)[number])}
          aria-label="Status filter"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              Status: {s}
            </option>
          ))}
        </select>
        <select
          className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-[10px] font-bold uppercase tracking-widest text-slate-600 outline-none"
          value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
          aria-label="Model filter"
        >
          <option value="">Model: All</option>
          {modelOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button
          className="h-9 px-4 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-500 hover:text-emerald-700 transition-all"
          onClick={exportCsv}
        >
          📥 Export
        </button>
      </div>

      {/* Log table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full text-left min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {["Date", "User", "Model", "Prompt", "Tokens", "Cost", "Latency", "Status", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={9} className="py-10 text-center text-sm text-slate-400">
                  Loading AI call log...
                </td>
              </tr>
            )}
            {!isLoading && isError && (
              <tr>
                <td colSpan={9} className="py-10 text-center text-sm text-red-600">
                  Failed to load the AI log. Try refreshing the page.
                </td>
              </tr>
            )}
            {!isLoading && !isError && filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="py-10 text-center text-sm text-slate-400">
                  No AI calls match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-4 py-3 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                  {formatDate(row.created_at)}
                </td>
                <td className="px-4 py-3 text-[11px] font-bold text-slate-700">
                  {row.user_name || (row.user_id ? `User ${row.user_id.slice(0, 8)}` : "System")}
                </td>
                <td className="px-4 py-3 text-[11px] font-mono text-slate-600">{row.model_name}</td>
                <td className="px-4 py-3 text-[11px] text-slate-500 max-w-[220px] truncate">
                  {row.prompt_snippet || "—"}
                </td>
                <td className="px-4 py-3 text-[11px] font-bold text-slate-700">
                  {(row.token_usage ?? 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-[11px] font-bold text-emerald-700">
                  ${Number(row.estimated_cost ?? 0).toFixed(3)}
                </td>
                <td className="px-4 py-3 text-[11px] text-slate-500">
                  {row.response_time_ms != null ? `${row.response_time_ms}ms` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                      row.status === "success"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : row.status === "timeout"
                          ? "bg-amber-50 text-amber-700 border-amber-100"
                          : "bg-red-50 text-red-700 border-red-100"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {row.status !== "success" && (
                    <button
                      className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline"
                      onClick={() => handleRetry(row)}
                    >
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AiGeneratePlanDialog />
    </div>
  );
};

export default AiLogTab;
