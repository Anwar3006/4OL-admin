"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useFitnessDashboardKpis } from "@/features/fitness/data/useFitnessDashboard";

import {
  DashboardTab,
  ExercisesTab,
  PlansTab,
  ChallengesTab,
  UsersTab,
  TrainersTab,
  ScheduleTab,
  OutdoorTab,
  WhatsAppTab,
  AiStudioTab,
  AiLogTab,
  HealthTab,
  SubscriptionsTab,
  FitCoinsTab,
} from "./tabs";

const fitnessTabs = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "exercises", label: "Exercises", icon: "🏋️" },
  { id: "plans", label: "Plans", icon: "📋" },
  { id: "challenges", label: "Challenges", icon: "🏆" },
  { id: "users", label: "Fitness Users", icon: "👥" },
  { id: "trainers", label: "Trainers", icon: "👨‍🏫" },
  { id: "outdoor", label: "Outdoor", icon: "🌳" },
  { id: "schedule", label: "Schedule", icon: "📅" },
  { id: "ai_studio", label: "AI Studio", icon: "🤖" },
  { id: "ai_log", label: "AI Log", icon: "📝" },
  { id: "health", label: "Health Integrations", icon: "📱" },
  { id: "subscriptions", label: "Subscriptions", icon: "💳" },
  { id: "fitcoins", label: "FitCoins", icon: "🪙" },
  { id: "whatsapp", label: "WhatsApp", icon: "💬" },
];

const FitnessPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "dashboard");
  const { data, isLoading } = useFitnessDashboardKpis();
  const metrics = data?.metrics;

  // Keep tab in sync if the URL changes externally (e.g. search navigation)
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(value === "dashboard" ? "/fitness" : `/fitness?tab=${value}`, {
      scroll: false,
    });
  };

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
        <KpiCard
          icon="🏋️"
          label="Fitness Users"
          value={isLoading ? "..." : (metrics?.total_fitness_users ?? 0).toLocaleString()}
          variant="blue"
        />
        <KpiCard
          icon="✅"
          label="Active Plans"
          value={isLoading ? "..." : (metrics?.active_plans ?? 0).toLocaleString()}
          variant="green"
        />
        <KpiCard
          icon="📢"
          label="Live Challenges"
          value={isLoading ? "..." : (metrics?.live_challenges ?? 0).toLocaleString()}
          variant="orange"
        />
        <KpiCard
          icon="📚"
          label="Exercises Library"
          value={isLoading ? "..." : (metrics?.exercise_library_count ?? 0).toLocaleString()}
          variant="teal"
        />
        <KpiCard
          icon="🪙"
          label="FitCoins Issued"
          value={isLoading ? "..." : (metrics?.fitcoins_issued ?? 0).toLocaleString()}
          variant="gold"
        />
        <KpiCard
          icon="🤖"
          label="AI-Generated Plans"
          value={isLoading ? "..." : (metrics?.ai_generated_plans ?? 0).toLocaleString()}
          variant="purple"
        />
      </div>

      {/* Tabs — w-full so the tab bar spans the full content area */}
      <Tabs
        value={activeTab}
        className="w-full min-w-0"
        onValueChange={handleTabChange}
      >
        {/* Tab bar */}
        <div className="border-b border-slate-200 mb-5 w-full overflow-hidden">
          <TabsList
            className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start
                       w-full overflow-x-auto overflow-y-hidden"
            style={
              {
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              } as React.CSSProperties
            }
          >
            {fitnessTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "shrink-0 whitespace-nowrap px-4 sm:px-5 py-2.5 sm:py-3",
                  "text-2xs sm:text-xs font-black uppercase tracking-widest",
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
          <TabsContent
            value="dashboard"
            className="outline-none w-full min-w-0"
          >
            <DashboardTab />
          </TabsContent>
          <TabsContent
            value="exercises"
            className="outline-none w-full min-w-0"
          >
            <ExercisesTab />
          </TabsContent>
          <TabsContent value="plans" className="outline-none w-full min-w-0">
            <PlansTab />
          </TabsContent>
          <TabsContent
            value="challenges"
            className="outline-none w-full min-w-0"
          >
            <ChallengesTab />
          </TabsContent>
          <TabsContent value="users" className="outline-none w-full min-w-0">
            <UsersTab />
          </TabsContent>
          <TabsContent value="trainers" className="outline-none w-full min-w-0">
            <TrainersTab />
          </TabsContent>
          <TabsContent value="schedule" className="outline-none w-full min-w-0">
            <ScheduleTab />
          </TabsContent>
          <TabsContent value="outdoor" className="outline-none w-full min-w-0">
            <OutdoorTab />
          </TabsContent>
          <TabsContent value="whatsapp" className="outline-none w-full min-w-0">
            <WhatsAppTab />
          </TabsContent>
          {/* Part V: AI Studio / AI Log / Health Integrations are now live
              (previously placeholder panels). */}
          <TabsContent value="ai_studio" className="outline-none w-full min-w-0">
            <AiStudioTab />
          </TabsContent>
          <TabsContent value="ai_log" className="outline-none w-full min-w-0">
            <AiLogTab />
          </TabsContent>
          <TabsContent value="health" className="outline-none w-full min-w-0">
            <HealthTab />
          </TabsContent>
          <TabsContent value="subscriptions" className="outline-none w-full min-w-0">
            <SubscriptionsTab />
          </TabsContent>
          <TabsContent value="fitcoins" className="outline-none w-full min-w-0">
            <FitCoinsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default FitnessPage;
