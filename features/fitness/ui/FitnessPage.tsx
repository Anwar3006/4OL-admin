"use client";

import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useFitnessDashboardKpis } from "@/features/fitness/data/useFitnessDashboard";

import {
  OverviewTab,
  ExercisesTab,
  PlansTab,
  ChallengesTab,
  UsersTab,
  TrainersTab,
  ScheduleTab,
  OutdoorTab,
  WhatsAppTab,
  AiStudioTab,
  HealthTab,
  FitCoinsTab,
} from "./tabs";

const fitnessTabs = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "exercises", label: "Exercises", icon: "🏋️" },
  { id: "plans", label: "Plans", icon: "📋" },
  { id: "challenges", label: "Challenges", icon: "🏆" },
  { id: "users", label: "Fitness Users", icon: "👥" },
  { id: "trainers", label: "Trainers", icon: "👨‍🏫" },
  { id: "outdoor", label: "Outdoor", icon: "🌳" },
  { id: "schedule", label: "Activity & Schedule", icon: "📅" },
  { id: "ai_studio", label: "AI Studio", icon: "🤖" },
  { id: "health", label: "Health Integrations", icon: "📱" },
  { id: "fitcoins", label: "FitCoins", icon: "🪙" },
  { id: "whatsapp", label: "WhatsApp", icon: "💬" },
];

const normaliseFitnessTab = (value: string | null) => {
  if (!value || value === "dashboard") return "overview";
  // Preserve old bookmarks after AI Log was merged into AI Studio.
  if (value === "ai_log") return "ai_studio";
  return fitnessTabs.some((tab) => tab.id === value) ? value : "overview";
};

const FitnessPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const activeTab = normaliseFitnessTab(tabParam);
  const { data, isLoading } = useFitnessDashboardKpis();
  const metrics = data?.metrics;

  const handleTabChange = (value: string) => {
    router.push(value === "overview" ? "/fitness" : "/fitness?tab=" + value, {
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

      {/*
        No card here gets a trend chart: get_fitness_dashboard_kpis reads a
        single cached row (fitness_dashboard_cache, refreshed every 10 min)
        with no history retained, so there's no real series to plot — a
        sparkline here would have to be fabricated. Sizing instead just
        signals reach/engagement (Fitness Users, Active Plans) as the two an
        admin reads first, at "default" size; the rest are "sm" since a
        bare number doesn't need the extra room.
      */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <KpiCard
          icon="🏋️"
          label="Fitness Users"
          value={isLoading ? "..." : (metrics?.total_fitness_users ?? 0).toLocaleString()}
          delta="Total reach"
          deltaType="neutral"
          variant="blue"
        />
        <KpiCard
          icon="✅"
          label="Active Plans"
          value={isLoading ? "..." : (metrics?.active_plans ?? 0).toLocaleString()}
          delta="Currently in progress"
          deltaType="neutral"
          variant="green"
        />
        <KpiCard
          icon="📢"
          label="Live Challenges"
          value={isLoading ? "..." : (metrics?.live_challenges ?? 0).toLocaleString()}
          variant="orange"
          size="sm"
        />
        <KpiCard
          icon="📚"
          label="Exercises Library"
          value={isLoading ? "..." : (metrics?.exercise_library_count ?? 0).toLocaleString()}
          variant="teal"
          size="sm"
        />
        <KpiCard
          icon="🪙"
          label="FitCoins Issued"
          value={isLoading ? "..." : (metrics?.fitcoins_issued ?? 0).toLocaleString()}
          variant="gold"
          size="sm"
        />
        <KpiCard
          icon="🤖"
          label="AI-Generated Plans"
          value={isLoading ? "..." : (metrics?.ai_generated_plans ?? 0).toLocaleString()}
          delta={
            isLoading || !metrics?.active_plans
              ? undefined
              : `${Math.round(((metrics.ai_generated_plans ?? 0) / metrics.active_plans) * 100)}% of active plans`
          }
          deltaType="neutral"
          variant="purple"
          size="sm"
        />
      </div>

      {/* Tabs — w-full so the tab bar spans the full content area */}
      <Tabs
        value={activeTab}
        className="w-full min-w-0"
        onValueChange={handleTabChange}
      >
        {/* Tab bar */}
        <div className="border-b border-slate-200 dark:border-slate-700 mb-5 w-full overflow-hidden">
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
                  "hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/15/40",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-700 dark:data-[state=active]:border-emerald-400",
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
            value="overview"
            className="outline-none w-full min-w-0"
          >
            <OverviewTab />
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
          {/* AI call logs now live inside AI Studio's Create & Logs tab. */}
          <TabsContent value="ai_studio" className="outline-none w-full min-w-0">
            <AiStudioTab />
          </TabsContent>
          <TabsContent value="health" className="outline-none w-full min-w-0">
            <HealthTab />
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
