"use client";

import React from "react";
import { useFitnessDashboardKpis } from "@/features/fitness/data/useFitnessDashboard";

const DashboardTab = () => {
  const { data, isLoading } = useFitnessDashboardKpis();
  const metrics = data?.metrics;

  const topChallenges = data?.top_challenges ?? [];
  const mostUsedPlans = data?.most_used_plans ?? [];
  const leaderboard = data?.fitcoin_leaderboard ?? [];
  const topExercises = data?.top_exercises ?? [];

  // Bars are scaled relative to the top exercise in the list so the
  // highest one always renders at 100% width.
  const maxExerciseCount = Math.max(
    1,
    ...topExercises.map((e) => e.completion_count),
  );

  const rankColor = (rank: number | null) => {
    if (rank === 1) return "text-yellow-600 dark:text-yellow-400";
    if (rank === 2) return "text-slate-400";
    if (rank === 3) return "text-orange-500";
    return "text-slate-700 dark:text-slate-300";
  };

  const rankLabel = (rank: number | null, index: number) => {
    if (rank === 1) return "🥇 1.";
    if (rank === 2) return "🥈 2.";
    if (rank === 3) return "🥉 3.";
    return `${rank ?? index + 1}.`;
  };

  return (
    <div className="w-full min-w-0 animate-in fade-in duration-500 space-y-5">

      {/* Mini KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="card flex items-center gap-3 p-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center text-lg shrink-0">📊</div>
          <div className="min-w-0">
            <div className="text-xl font-black text-orange-500 leading-tight">
              {isLoading ? "..." : (metrics?.active_workouts ?? 0).toLocaleString()}
            </div>
            <div className="text-2xs text-slate-400 font-bold uppercase tracking-wider">Active Workouts</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center text-lg shrink-0">✅</div>
          <div className="min-w-0">
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 leading-tight">
              {isLoading ? "..." : `${metrics?.avg_streak ?? 0} days`}
            </div>
            <div className="text-2xs text-slate-400 font-bold uppercase tracking-wider">Avg Streak</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-yellow-50 dark:bg-yellow-500/15 flex items-center justify-center text-lg shrink-0">🏆</div>
          <div className="min-w-0">
            <div className="text-xl font-black text-yellow-600 dark:text-yellow-400 leading-tight">
              {isLoading ? "..." : `${metrics?.avg_completion ?? 0}%`}
            </div>
            <div className="text-2xs text-slate-400 font-bold uppercase tracking-wider">Avg Completion</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/15 flex items-center justify-center text-lg shrink-0">🤖</div>
          <div className="min-w-0">
            <div className="text-xl font-black text-purple-600 dark:text-purple-400 leading-tight">
              {isLoading ? "..." : (metrics?.ai_generated_plans ?? 0).toLocaleString()}
            </div>
            <div className="text-2xs text-slate-400 font-bold uppercase tracking-wider">AI Plans Active</div>
          </div>
        </div>
      </div>

      {/* Three-column cards */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Top Challenges */}
        <div className="card min-w-0">
          <div className="card-header">
            <h3 className="card-title">📋 Top Challenges (Active)</h3>
          </div>
          <div className="space-y-1">
            {isLoading && (
              <div className="text-xs text-slate-400 font-semibold py-2">Loading…</div>
            )}
            {!isLoading && topChallenges.length === 0 && (
              <div className="text-xs text-slate-400 font-semibold py-2">No active challenges yet.</div>
            )}
            {topChallenges.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 gap-2">
                <span className="min-w-0 text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{item.title}</span>
                <span className="text-xs font-black shrink-0 text-emerald-700 dark:text-emerald-400">
                  {item.participants_count.toLocaleString()} joined
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Used Plans */}
        <div className="card min-w-0">
          <div className="card-header">
            <h3 className="card-title">📋 Most Used Plans</h3>
          </div>
          <div className="space-y-1">
            {isLoading && (
              <div className="text-xs text-slate-400 font-semibold py-2">Loading…</div>
            )}
            {!isLoading && mostUsedPlans.length === 0 && (
              <div className="text-xs text-slate-400 font-semibold py-2">No plan usage yet.</div>
            )}
            {mostUsedPlans.map((item) => (
              <div key={item.plan_id} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 gap-2">
                <span className="min-w-0 text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{item.title}</span>
                <span className="text-xs font-black shrink-0 text-blue-600 dark:text-blue-400">
                  {item.usage_count.toLocaleString()} sessions
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* FitCoins Leaderboard */}
        <div className="card min-w-0">
          <div className="card-header">
            <h3 className="card-title">🪙 FitCoins Leaderboard</h3>
          </div>
          <div className="space-y-1">
            {isLoading && (
              <div className="text-xs text-slate-400 font-semibold py-2">Loading…</div>
            )}
            {!isLoading && leaderboard.length === 0 && (
              <div className="text-xs text-slate-400 font-semibold py-2">No ranked users yet.</div>
            )}
            {leaderboard.map((item, i) => (
              <div key={item.user_id} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-black w-7 shrink-0">
                    {rankLabel(item.rank_position, i)}
                  </span>
                  {/* The RPC only returns user_id (see get_fitness_dashboard_kpis
                      in KPIs.sql) — no join to fitness_users/user_profiles for a
                      display name, so we show a truncated id. Update the RPC's
                      `leaderboard` CTE to join in a name if that's needed here. */}
                  <span className="min-w-0 text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                    User {item.user_id.slice(0, 8)}
                  </span>
                </div>
                <span className={`text-xs font-black shrink-0 ${rankColor(item.rank_position)}`}>
                  {item.score.toLocaleString()} 🪙
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two-column cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Top Exercises by Usage */}
        <div className="card min-w-0">
          <div className="card-header">
            <h3 className="card-title">🏋️ Top Exercises by Usage</h3>
          </div>
          <div className="space-y-3">
            {isLoading && (
              <div className="text-xs text-slate-400 font-semibold py-2">Loading…</div>
            )}
            {!isLoading && topExercises.length === 0 && (
              <div className="text-xs text-slate-400 font-semibold py-2">No exercise logs yet.</div>
            )}
            {topExercises.map((item) => {
              const pct = Math.round((item.completion_count / maxExerciseCount) * 100);
              return (
                <div key={item.exercise_id}>
                  <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    <span className="min-w-0 truncate">{item.name}</span>
                    <span className="text-blue-600 dark:text-blue-400 shrink-0">{item.completion_count.toLocaleString()} sets logged</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card min-w-0">
          <div className="card-header">
            <h3 className="card-title">⚡ Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              "📋 Add Exercise",
              "📋 Create Plan",
              "📋 New Challenge",
              "📋 Add Trainer",
              "📣 Broadcast",
              "🗂️ Archive Logs",
            ].map((action, i) => (
              <button
                key={i}
                className="btn btn-secondary justify-start text-xs font-bold py-3 px-3 h-auto rounded-xl
                           hover:border-emerald-500 hover:text-emerald-700"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
