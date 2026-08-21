"use client";

import React, { useState } from "react";
import {
  useAiGeneratePlanDialog,
} from "@/stores/dialog-store";
import { useFitnessAiLogStats } from "@/hooks/supabase-calls/useFitnessAnalytics";
import { useFitnessDashboardKpis } from "@/hooks/supabase-calls/useFitnessDashboard";
import AiGeneratePlanDialog from "../_components/ai-generate-plan-dialog";

/**
 * AI Studio tab (Gap Analysis Part V, tab 8). 3-step wizard:
 * ① Context Input → ② Platform Insights (live aggregates, auto-injected) →
 * ③ Generate (delegates to the existing admin generation dialog which hits
 * /api/fitness/generate-admin, rate-limited 20/hour). Publishing new plans
 * into production stays a super_admin action via the Plans tab.
 */

const STEPS = ["Context Input", "Platform Insights", "Generate"];

interface StudioContext {
  plan_type: string;
  difficulty: string;
  duration_weeks: string;
  fitcoin_budget: string;
  target_tier: string;
  theme: string;
  instructions: string;
}

const EMPTY_CONTEXT: StudioContext = {
  plan_type: "strength",
  difficulty: "beginner",
  duration_weeks: "4",
  fitcoin_budget: "100",
  target_tier: "free",
  theme: "",
  instructions: "",
};

const AiStudioTab = () => {
  const [step, setStep] = useState(0);
  const [context, setContext] = useState<StudioContext>(EMPTY_CONTEXT);
  const aiGenerateDialog = useAiGeneratePlanDialog();

  const { data: aiStats } = useFitnessAiLogStats(30);
  const { data: kpis } = useFitnessDashboardKpis();

  const topExercise = kpis?.top_exercises?.[0];
  const topModel = aiStats?.by_model?.[0];
  const totals = aiStats?.totals;

  const insights = [
    {
      label: "Top exercise",
      value: topExercise
        ? `${topExercise.name} (${topExercise.completion_count.toLocaleString()} sets)`
        : "No usage data yet",
      icon: "🏋️",
    },
    {
      label: "Avg streak",
      value: `${kpis?.metrics?.avg_streak ?? 0} days`,
      icon: "🔥",
    },
    {
      label: "Avg plan completion",
      value: `${kpis?.metrics?.avg_completion ?? 0}%`,
      icon: "🏁",
    },
    {
      label: "Dominant AI model",
      value: topModel ? `${topModel.model_name} (${topModel.calls.toLocaleString()} calls)` : "None",
      icon: "🤖",
    },
    {
      label: "Avg generation latency",
      value: totals ? `${totals.avg_latency_ms.toLocaleString()}ms` : "—",
      icon: "⚡",
    },
    {
      label: "AI-generated plans (live)",
      value: (kpis?.metrics?.ai_generated_plans ?? 0).toLocaleString(),
      icon: "🧠",
    },
  ];

  const set = (key: keyof StudioContext, value: string) =>
    setContext((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <button
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                i === step
                  ? "bg-slate-900 text-white"
                  : i < step
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    : "bg-white text-slate-400 border border-slate-200"
              }`}
              onClick={() => i < step && setStep(i)}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  i === step ? "bg-white/20" : i < step ? "bg-emerald-100" : "bg-slate-100"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              {label}
            </button>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px bg-slate-200 max-w-16" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1 — Context Input */}
      {step === 0 && (
        <div className="card space-y-4">
          <h3 className="text-lg font-black text-slate-800">① Context Input</h3>
          <p className="text-xs text-slate-500 font-medium -mt-2">
            Describe the generation target. These values pre-fill the generation
            context and never touch user data.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Plan type
              </span>
              <select
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none"
                value={context.plan_type}
                onChange={(e) => set("plan_type", e.target.value)}
              >
                {["strength", "cardio", "hiit", "yoga", "pilates", "calisthenics"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Difficulty
              </span>
              <select
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none"
                value={context.difficulty}
                onChange={(e) => set("difficulty", e.target.value)}
              >
                {["beginner", "intermediate", "advanced"].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Duration (weeks)
              </span>
              <input
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none"
                value={context.duration_weeks}
                onChange={(e) => set("duration_weeks", e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                FitCoin reward budget
              </span>
              <input
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none"
                value={context.fitcoin_budget}
                onChange={(e) => set("fitcoin_budget", e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Target tier
              </span>
              <select
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none"
                value={context.target_tier}
                onChange={(e) => set("target_tier", e.target.value)}
              >
                {["free", "pro", "premium"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Theme (optional)
              </span>
              <input
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 outline-none"
                placeholder="e.g. Ramadan fitness push"
                value={context.theme}
                onChange={(e) => set("theme", e.target.value)}
              />
            </label>
          </div>
          <label className="space-y-1 block">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Additional instructions
            </span>
            <textarea
              className="w-full min-h-20 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 outline-none"
              placeholder="Any constraints for the generator..."
              value={context.instructions}
              onChange={(e) => set("instructions", e.target.value)}
            />
          </label>
          <div className="flex justify-end">
            <button
              className="h-10 px-5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
              onClick={() => setStep(1)}
            >
              Continue → Insights
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Platform Insights (auto-injected, live) */}
      {step === 1 && (
        <div className="card space-y-4">
          <h3 className="text-lg font-black text-slate-800">② Platform Insights</h3>
          <p className="text-xs text-slate-500 font-medium -mt-2">
            Auto-injected from live platform aggregates (fitness_ai_calls,
            exercise_sessions, dashboard cache). Use them to align the new
            generation with real user behaviour.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {insights.map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 p-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  {item.icon} {item.label}
                </div>
                <div className="text-xs font-black text-slate-800">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            <button
              className="h-10 px-5 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
              onClick={() => setStep(0)}
            >
              ← Back
            </button>
            <button
              className="h-10 px-5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
              onClick={() => setStep(2)}
            >
              Continue → Generate
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Generate */}
      {step === 2 && (
        <div className="card space-y-4">
          <h3 className="text-lg font-black text-slate-800">③ Generate</h3>
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-1 text-xs font-medium text-slate-600">
            <div><span className="font-black text-slate-800">Type:</span> {context.plan_type} · {context.difficulty} · {context.duration_weeks} weeks</div>
            <div><span className="font-black text-slate-800">Tier:</span> {context.target_tier} · <span className="font-black text-slate-800">FitCoin budget:</span> {context.fitcoin_budget}</div>
            {context.theme && <div><span className="font-black text-slate-800">Theme:</span> {context.theme}</div>}
            {context.instructions && <div><span className="font-black text-slate-800">Instructions:</span> {context.instructions}</div>}
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-[11px] font-semibold text-amber-800">
            💡 Each generation costs approximately $0.04–$0.08. Generated plans
            are created as drafts; publishing them to users requires a
            super_admin action in the Plans tab.
          </div>
          <div className="flex justify-between">
            <button
              className="h-10 px-5 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
              onClick={() => setStep(1)}
            >
              ← Back
            </button>
            <button
              className="h-10 px-5 rounded-xl bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-800 transition-all"
              onClick={() => aiGenerateDialog.open()}
            >
              🤖 Use & Generate Plan
            </button>
          </div>
        </div>
      )}

      <AiGeneratePlanDialog />
    </div>
  );
};

export default AiStudioTab;
