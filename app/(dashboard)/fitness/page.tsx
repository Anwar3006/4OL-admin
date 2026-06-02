"use client";

import React, { useState } from "react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Tab Components
import {
  DashboardTab,
  ExercisesTab,
  PlansTab,
  ChallengesTab,
  UsersTab,
  TrainersTab,
  ScheduleTab
} from "./_tabs";

const fitnessTabs = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "exercises", label: "Exercises", icon: "🏋️" },
  { id: "plans", label: "Plans", icon: "📋" },
  { id: "challenges", label: "Challenges", icon: "🏆" },
  { id: "users", label: "Fitness Users", icon: "👥" },
  { id: "trainers", label: "Trainers", icon: "👨‍🏫" },
  { id: "schedule", label: "Schedule", icon: "📅" },
  { id: "ai_studio", label: "AI Studio", icon: "🤖" },
  { id: "ai_log", label: "AI Log", icon: "📝" },
  { id: "outdoor", label: "Outdoor", icon: "🌳" },
  { id: "health", label: "Health Integrations", icon: "📱" },
  { id: "whatsapp", label: "WhatsApp", icon: "💬" },
];

const FitnessPage = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="animate-in fade-in duration-500">
      {/* Page Header */}
      <PageHeader
        title="💪 Fitness"
        subtitle="Workout programs · AI Personal Trainer · Gym integration · FitCoins · Challenges"
      >
        <button className="btn btn-secondary">📥 Export</button>
        <button className="btn btn-secondary">+ Exercise</button>
        <button className="btn btn-secondary">+ Route</button>
        <button className="btn btn-primary">+ New Plan</button>
      </PageHeader>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 sm:gap-5 mb-5">
        <KpiCard
          icon="🏋️"
          label="Fitness Users"
          value="8,247"
          variant="blue"
          delta="+340 this month"
          deltaType="up"
        />
        <KpiCard
          icon="✅"
          label="Active Plans"
          value="184"
          variant="green"
          delta="+12 this month"
          deltaType="up"
        />
        <KpiCard
          icon="📢"
          label="Live Challenges"
          value="8"
          variant="orange"
          delta="4 ending soon"
        />
        <KpiCard
          icon="📊"
          label="Exercises Library"
          value="1,240"
          variant="teal"
          delta="+24 added"
          deltaType="up"
        />
        <KpiCard
          icon="⏳"
          label="FitCoins Issued"
          value="2.4M"
          variant="gold"
          delta="+124K this month"
          deltaType="up"
        />
        <KpiCard
          icon="📊"
          label="AI-Generated Plans"
          value="42"
          variant="purple"
          delta="+8 this week"
          deltaType="up"
        />
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="dashboard" className="w-full" onValueChange={setActiveTab}>
        <div className="tabs mb-4 overflow-x-auto no-scrollbar">
          <TabsList className="bg-transparent h-auto p-0 flex gap-0">
            {fitnessTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "tab transition-all duration-150 data-[state=active]:active data-[state=active]:text-ek-green-dark data-[state=active]:border-b-3 data-[state=active]:border-ek-green-dark",
                  activeTab === tab.id ? "active" : ""
                )}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="mt-4">
          <TabsContent value="dashboard" className="outline-none">
            <DashboardTab />
          </TabsContent>
          
          <TabsContent value="exercises" className="outline-none">
            <ExercisesTab />
          </TabsContent>

          <TabsContent value="plans" className="outline-none">
            <PlansTab />
          </TabsContent>

          <TabsContent value="challenges" className="outline-none">
            <ChallengesTab />
          </TabsContent>

          <TabsContent value="users" className="outline-none">
            <UsersTab />
          </TabsContent>

          <TabsContent value="trainers" className="outline-none">
            <TrainersTab />
          </TabsContent>

          <TabsContent value="schedule" className="outline-none">
            <ScheduleTab />
          </TabsContent>

          {/* Placeholder for remaining tabs */}
          {["ai_studio", "ai_log", "outdoor", "health", "whatsapp"].map((tabId) => (
             <TabsContent key={tabId} value={tabId} className="outline-none">
                <div className="card text-center py-16">
                  <div className="max-w-md mx-auto space-y-6">
                    <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-4xl shadow-sm">
                      {fitnessTabs.find(t => t.id === tabId)?.icon}
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-extrabold text-slate-800 capitalize">
                        {tabId.replace("_", " ")} Management
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        This module is currently being optimized for the new high-fidelity architecture.
                      </p>
                    </div>
                    <div className="pt-4 flex justify-center gap-2">
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
