"use client";

import React, { useState } from "react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import {
  DashboardTab,
  ExercisesTab,
  PlansTab,
  ChallengesTab,
  UsersTab,
  TrainersTab,
  ScheduleTab,
  OutdoorTab,
} from "./_tabs";

const fitnessTabs = [
  { id: "dashboard",  label: "Dashboard",           icon: "📊" },
  { id: "exercises",  label: "Exercises",            icon: "🏋️" },
  { id: "plans",      label: "Plans",                icon: "📋" },
  { id: "challenges", label: "Challenges",           icon: "🏆" },
  { id: "users",      label: "Fitness Users",        icon: "👥" },
  { id: "trainers",   label: "Trainers",             icon: "👨‍🏫" },
  { id: "schedule",   label: "Schedule",             icon: "📅" },
  { id: "ai_studio",  label: "AI Studio",            icon: "🤖" },
  { id: "ai_log",     label: "AI Log",               icon: "📝" },
  { id: "outdoor",    label: "Outdoor",              icon: "🌳" },
  { id: "health",     label: "Health Integrations",  icon: "📱" },
  { id: "whatsapp",   label: "WhatsApp",             icon: "💬" },
];

const FitnessPage = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    /* w-full so content fills the entire content-area width, not half of it */
    <div className="w-full min-w-0 animate-in fade-in duration-500 space-y-6">

      <PageHeader
        title="💪 Fitness"
        subtitle="Workout programs · AI Personal Trainer · Gym integration · FitCoins · Challenges"
      >
        <button className="btn btn-secondary btn-sm">📥 Export</button>
        <button className="btn btn-secondary btn-sm">+ Exercise</button>
        <button className="btn btn-secondary btn-sm">+ Route</button>
        <button className="btn btn-primary btn-sm">+ New Plan</button>
      </PageHeader>

      {/* KPI row — 2 cols on mobile, up to 6 on very wide screens */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <KpiCard icon="🏋️" label="Fitness Users"      value="8,247" variant="blue"   delta="+340 this month" deltaType="up" />
        <KpiCard icon="✅" label="Active Plans"         value="184"   variant="green"  delta="+12 this month"  deltaType="up" />
        <KpiCard icon="📢" label="Live Challenges"      value="8"     variant="orange" delta="4 ending soon" />
        <KpiCard icon="📚" label="Exercises Library"    value="1,240" variant="teal"   delta="+24 added"       deltaType="up" />
        <KpiCard icon="🪙" label="FitCoins Issued"      value="2.4M"  variant="gold"   delta="+124K this month" deltaType="up" />
        <KpiCard icon="🤖" label="AI-Generated Plans"   value="42"    variant="purple" delta="+8 this week"    deltaType="up" />
      </div>

      {/* Tabs — w-full so the tab bar spans the full content area */}
      <Tabs defaultValue="dashboard" className="w-full min-w-0" onValueChange={setActiveTab}>

        {/* Tab bar */}
        <div className="border-b border-slate-200 mb-5 w-full overflow-hidden">
          <TabsList
            className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start
                       w-full overflow-x-auto overflow-y-hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {fitnessTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "shrink-0 whitespace-nowrap px-4 sm:px-5 py-2.5 sm:py-3",
                  "text-[10px] sm:text-[11px] font-black uppercase tracking-widest",
                  "text-slate-400 border-b-2 border-transparent",
                  "transition-all rounded-none outline-none cursor-pointer",
                  "hover:text-emerald-700 hover:bg-emerald-50/40",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-700",
                )}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab content — each panel is also full-width */}
        <div className="w-full min-w-0">
          <TabsContent value="dashboard"  className="outline-none w-full min-w-0"><DashboardTab /></TabsContent>
          <TabsContent value="exercises"  className="outline-none w-full min-w-0"><ExercisesTab /></TabsContent>
          <TabsContent value="plans"      className="outline-none w-full min-w-0"><PlansTab /></TabsContent>
          <TabsContent value="challenges" className="outline-none w-full min-w-0"><ChallengesTab /></TabsContent>
          <TabsContent value="users"      className="outline-none w-full min-w-0"><UsersTab /></TabsContent>
          <TabsContent value="trainers"   className="outline-none w-full min-w-0"><TrainersTab /></TabsContent>
          <TabsContent value="schedule"   className="outline-none w-full min-w-0"><ScheduleTab /></TabsContent>
          <TabsContent value="outdoor"    className="outline-none w-full min-w-0"><OutdoorTab /></TabsContent>

          {/* Placeholder panels for in-progress tabs */}
          {["ai_studio", "ai_log", "health", "whatsapp"].map((tabId) => (
            <TabsContent key={tabId} value={tabId} className="outline-none w-full min-w-0">
              <div className="card text-center py-16 w-full">
                <div className="max-w-md mx-auto space-y-5">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-50 border border-slate-100
                                  flex items-center justify-center mx-auto text-3xl sm:text-4xl shadow-sm">
                    {fitnessTabs.find((t) => t.id === tabId)?.icon}
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 capitalize">
                      {tabId.replace("_", " ")} Management
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      This module is being optimised for the new high-fidelity architecture.
                    </p>
                  </div>
                  <div className="flex justify-center gap-2 pt-2">
                    <span className="badge badge-amber uppercase tracking-wider">Coming Soon</span>
                    <span className="badge badge-green uppercase tracking-wider">V2 Ready</span>
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
};

export default FitnessPage;
