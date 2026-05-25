"use client";

import React, { useState } from "react";
import { 
  Activity, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  BarChart3, 
  Dumbbell, 
  ClipboardList, 
  Trophy, 
  Users, 
  UserSquare, 
  Calendar, 
  Bot, 
  History, 
  Map as MapIcon, 
  HeartPulse, 
  MessageSquare,
  Zap,
  ShieldCheck,
  Info,
  TrendingUp,
  Award
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import SectionHeader from "@/components/SectionHeader";

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

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "exercises", label: "Exercises", icon: Dumbbell },
  { id: "plans", label: "Plans", icon: ClipboardList },
  { id: "challenges", label: "Challenges", icon: Trophy },
  { id: "users", label: "Fitness Users", icon: Users },
  { id: "trainers", label: "Trainers", icon: UserSquare },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "ai_studio", label: "AI Studio", icon: Bot },
  { id: "ai_log", label: "AI Log", icon: History },
  { id: "outdoor", label: "Outdoor", icon: MapIcon },
  { id: "health", label: "Health Integrations", icon: HeartPulse },
  { id: "whatsapp", label: "WhatsApp Community", icon: MessageSquare },
];

const HealthyLivingHub = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <section className="mx-auto lg:px-6 py-6 max-w-[2400px] min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3" style={{ fontFamily: "var(--font-syne)" }}>
            <span className="bg-emerald-100 p-2 rounded-2xl">💪</span>
            Fitness Hub
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Exercise library · AI Studio · Challenges · Plans · Outdoor routes · WhatsApp community
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" className="rounded-xl font-bold border-slate-200">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button variant="outline" className="rounded-xl font-bold border-slate-200">
            <Zap className="h-4 w-4 mr-2 text-amber-500" /> AI Settings
          </Button>
          <Button className="rounded-xl font-bold bg-[#2cc295] hover:bg-[#25a37d] shadow-lg shadow-emerald-200/50">
            <Plus className="h-4 w-4 mr-2" /> Add Exercise
          </Button>
        </div>
      </div>

      {/* KPI Stats Quick Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active Plans", value: "1,240", icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Total Users", value: "3,840", icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Challenges", value: "284", icon: Trophy, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Avg Uptime", value: "96%", icon: ShieldCheck, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                  <h3 className={`text-2xl font-black ${stat.color}`}>{stat.value}</h3>
                </div>
                <div className={`h-12 w-12 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab Navigation */}
      <Tabs defaultValue="dashboard" className="w-full" onValueChange={setActiveTab}>
        <div className="relative mb-8">
          <TabsList className="h-auto p-2 bg-slate-100/50 backdrop-blur-sm rounded-[2rem] border border-slate-200/50 flex flex-nowrap overflow-x-auto no-scrollbar justify-start lg:justify-between w-full">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md shrink-0"
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden xl:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="mt-6">
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
                <Card className="border-none shadow-sm rounded-[2rem] bg-white p-12 text-center">
                  <div className="max-w-md mx-auto space-y-6">
                    <div className="h-24 w-24 rounded-[2rem] bg-slate-50 flex items-center justify-center mx-auto border border-slate-100">
                      {React.createElement(tabs.find(t => t.id === tabId)?.icon || Info, { className: "h-10 w-10 text-slate-300" })}
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black text-slate-900 capitalize" style={{ fontFamily: "var(--font-syne)" }}>
                        {tabId.replace("_", " ")} Management
                      </h2>
                      <p className="text-slate-500 font-medium">
                        This module is currently being optimized for the new Healthy Living architecture.
                      </p>
                    </div>
                    <div className="pt-4 flex justify-center gap-3">
                       <Badge variant="secondary" className="px-4 py-1 rounded-full bg-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-none">Coming Soon</Badge>
                       <Badge variant="secondary" className="px-4 py-1 rounded-full bg-emerald-50 text-emerald-600 font-bold uppercase text-[10px] tracking-widest border-none">V2 Ready</Badge>
                    </div>
                  </div>
                </Card>
             </TabsContent>
          ))}
        </div>
      </Tabs>
    </section>
  );
};

export default HealthyLivingHub;
