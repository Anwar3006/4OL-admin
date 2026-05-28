"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

const DashboardTab = () => {
  return (
    <div className="animate-in fade-in duration-500">
      {/* Secondary KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="card flex items-center gap-3 p-3">
          <div className="w-10 h-10 rounded-lg bg-ek-blue-light flex items-center justify-center text-lg">📊</div>
          <div>
            <div className="text-xl font-black text-ek-orange leading-tight">2,340</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Today</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-3">
          <div className="w-10 h-10 rounded-lg bg-ek-green-light flex items-center justify-center text-lg">✅</div>
          <div>
            <div className="text-xl font-black text-ek-green-dark leading-tight">14 days</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg Streak</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-3">
          <div className="w-10 h-10 rounded-lg bg-ek-gold-light flex items-center justify-center text-lg">🏆</div>
          <div>
            <div className="text-xl font-black text-ek-gold leading-tight">68%</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg Completion</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-3">
          <div className="w-10 h-10 rounded-lg bg-ek-purple-light flex items-center justify-center text-lg">🤖</div>
          <div>
            <div className="text-xl font-black text-ek-purple leading-tight">42</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">AI Plans Active</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Top Challenges */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title text-slate-800">📋 Top Challenges (Active)</h3>
          </div>
          <div className="space-y-3">
            {[
              { name: "30-Day Push-Up Challenge", val: "1,240 joined", color: "text-ek-green-dark" },
              { name: "10,000 Steps Daily", val: "892 joined", color: "text-ek-blue" },
              { name: "Core Strength Week", val: "640 joined", color: "text-ek-orange" },
              { name: "Beginner Yoga 7-Day", val: "420 joined", color: "text-ek-teal" },
              { name: "Weight Loss Sprint", val: "312 joined", color: "text-ek-purple" },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                <span className="text-xs font-semibold text-slate-700">{item.name}</span>
                <span className={`text-[11px] font-black ${item.color}`}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Used Plans */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title text-slate-800">📋 Most Used Plans</h3>
          </div>
          <div className="space-y-3">
            {[
              { name: "Full Body Beginner (12wk)", val: "384 users", color: "text-ek-green-dark" },
              { name: "Weight Loss Program (8wk)", val: "298 users", color: "text-ek-blue" },
              { name: "Muscle Gain Advanced (16wk)", val: "214 users", color: "text-ek-orange" },
              { name: "Cardio Endurance (6wk)", val: "176 users", color: "text-ek-teal" },
              { name: "AI Custom Plans (various)", val: "42 active", color: "text-ek-purple" },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                <span className="text-xs font-semibold text-slate-700">{item.name}</span>
                <span className={`text-[11px] font-black ${item.color}`}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FitCoins Leaderboard */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title text-slate-800">📋 FitCoins Leaderboard</h3>
          </div>
          <div className="space-y-3">
            {[
              { rank: "🥇 1.", name: "Kwame O****", val: "12,480 🪙", color: "text-ek-gold" },
              { rank: "🥈 2.", name: "Ama A****", val: "10,240 🪙", color: "text-slate-400" },
              { rank: "🥉 3.", name: "Kofi B****", val: "9,120 🪙", color: "text-ek-orange" },
              { rank: "4.", name: "Abena O****", val: "8,640 🪙", color: "text-slate-700" },
              { rank: "5.", name: "John M****", val: "7,920 🪙", color: "text-slate-700" },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black w-7">{item.rank}</span>
                  <span className="text-xs font-semibold text-slate-700">{item.name}</span>
                </div>
                <span className={`text-[11px] font-black ${item.color}`}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Exercises by Usage */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title text-slate-800">📋 Top Exercises by Usage</h3>
          </div>
          <div className="space-y-4">
            {[
              { name: "Push-Ups", val: "4,820 sets logged", pct: 100, color: "bg-ek-blue" },
              { name: "Squats", val: "4,120 sets", pct: 85, color: "bg-ek-blue" },
              { name: "Plank Hold", val: "3,840 sets", pct: 80, color: "bg-ek-teal" },
              { name: "Lunges", val: "3,240 sets", pct: 67, color: "bg-ek-orange" },
              { name: "Burpees", val: "2,180 sets", pct: 45, color: "bg-ek-purple" },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1.5">
                  <span>{item.name}</span>
                  <span className="text-ek-blue">{item.val}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${item.color}`} 
                    style={{ width: `${item.pct}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title text-slate-800">⚡ Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              "📋 Add Exercise", "📋 Create Plan", 
              "📋 New Challenge", "📋 Add Trainer", 
              "📋 Broadcast", "📋 Archive Logs"
            ].map((action, i) => (
              <button 
                key={i} 
                className="btn btn-secondary justify-start text-[11px] font-bold py-3 px-4 h-auto rounded-xl hover:border-ek-green hover:text-ek-green-dark"
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
