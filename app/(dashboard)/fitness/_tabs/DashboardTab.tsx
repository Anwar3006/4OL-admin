"use client";

import React from "react";

const DashboardTab = () => {
  return (
    <div className="w-full min-w-0 animate-in fade-in duration-500 space-y-5">

      {/* Mini KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="card flex items-center gap-3 p-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-lg shrink-0">📊</div>
          <div className="min-w-0">
            <div className="text-xl font-black text-orange-500 leading-tight">2,340</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Today</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-lg shrink-0">✅</div>
          <div className="min-w-0">
            <div className="text-xl font-black text-emerald-700 leading-tight">14 days</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg Streak</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center text-lg shrink-0">🏆</div>
          <div className="min-w-0">
            <div className="text-xl font-black text-yellow-600 leading-tight">68%</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg Completion</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-lg shrink-0">🤖</div>
          <div className="min-w-0">
            <div className="text-xl font-black text-purple-600 leading-tight">42</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">AI Plans Active</div>
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
            {[
              { name: "30-Day Push-Up Challenge", val: "1,240 joined", cls: "text-emerald-700" },
              { name: "10,000 Steps Daily",        val: "892 joined",  cls: "text-blue-600"   },
              { name: "Core Strength Week",        val: "640 joined",  cls: "text-orange-500" },
              { name: "Beginner Yoga 7-Day",       val: "420 joined",  cls: "text-teal-600"   },
              { name: "Weight Loss Sprint",        val: "312 joined",  cls: "text-purple-600" },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 gap-2">
                <span className="min-w-0 text-xs font-semibold text-slate-700 truncate">{item.name}</span>
                <span className={`text-[11px] font-black shrink-0 ${item.cls}`}>{item.val}</span>
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
            {[
              { name: "Full Body Beginner (12wk)",   val: "384 users", cls: "text-emerald-700" },
              { name: "Weight Loss Program (8wk)",   val: "298 users", cls: "text-blue-600"    },
              { name: "Muscle Gain Advanced (16wk)", val: "214 users", cls: "text-orange-500"  },
              { name: "Cardio Endurance (6wk)",      val: "176 users", cls: "text-teal-600"    },
              { name: "AI Custom Plans (various)",   val: "42 active", cls: "text-purple-600"  },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 gap-2">
                <span className="min-w-0 text-xs font-semibold text-slate-700 truncate">{item.name}</span>
                <span className={`text-[11px] font-black shrink-0 ${item.cls}`}>{item.val}</span>
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
            {[
              { rank: "🥇 1.", name: "Kwame O****", val: "12,480 🪙", cls: "text-yellow-600"  },
              { rank: "🥈 2.", name: "Ama A****",   val: "10,240 🪙", cls: "text-slate-400"   },
              { rank: "🥉 3.", name: "Kofi B****",  val: "9,120 🪙",  cls: "text-orange-500"  },
              { rank: "4.",    name: "Abena O****", val: "8,640 🪙",  cls: "text-slate-700"   },
              { rank: "5.",    name: "John M****",  val: "7,920 🪙",  cls: "text-slate-700"   },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-black w-7 shrink-0">{item.rank}</span>
                  <span className="min-w-0 text-xs font-semibold text-slate-700 truncate">{item.name}</span>
                </div>
                <span className={`text-[11px] font-black shrink-0 ${item.cls}`}>{item.val}</span>
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
            {[
              { name: "Push-Ups",  val: "4,820 sets logged", pct: 100, bar: "bg-blue-500"   },
              { name: "Squats",    val: "4,120 sets",         pct: 85,  bar: "bg-blue-500"   },
              { name: "Plank Hold",val: "3,840 sets",         pct: 80,  bar: "bg-teal-500"   },
              { name: "Lunges",    val: "3,240 sets",         pct: 67,  bar: "bg-orange-500" },
              { name: "Burpees",   val: "2,180 sets",         pct: 45,  bar: "bg-purple-500" },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-slate-600 mb-1.5">
                  <span className="min-w-0 truncate">{item.name}</span>
                  <span className="text-blue-600 shrink-0">{item.val}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${item.bar}`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
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
                className="btn btn-secondary justify-start text-[11px] font-bold py-3 px-3 h-auto rounded-xl
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
