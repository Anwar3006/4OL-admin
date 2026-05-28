"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MedicationStats from "./_components/MedicationStats";
import DrugDatabaseTab from "./_components/DrugDatabaseTab";
import LoggedRemindersTab from "./_components/LoggedRemindersTab";
import AdherenceTab from "./_components/AdherenceTab";
import InteractionsTab from "./_components/InteractionsTab";
import AICheckerTab from "./_components/AICheckerTab";
import { cn } from "@/lib/utils";

const MedTabs = [
  { id: "database", label: "💊 Drug Database" },
  { id: "logged", label: "🔔 Logged Reminders" },
  { id: "adherence", label: "📋 Adherence" },
  { id: "interactions", label: "⚠️ Interactions" },
  { id: "ai", label: "🤖 AI Checker" },
];

const MedicationReminderPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "database");

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", value);
    window.history.pushState(null, "", `?${params.toString()}`);
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="💊 Medication Reminder"
        subtitle="Drug database · Interaction checker · Dosage reminders · Prescription tracking"
      >
        <button className="btn btn-secondary">📥 Export</button>
        <button className="btn btn-secondary">📋 AI Settings</button>
        <button className="btn btn-primary text-white font-black uppercase tracking-widest">+ Add Drug</button>
      </PageHeader>

      <div className="alert bg-ek-green/5 border border-ek-green/20 text-[11px] font-medium p-3 rounded-xl flex items-start gap-2.5">
        <span className="text-base leading-none mt-0.5 text-ek-green-dark">🔗</span>
        <div className="flex-1 text-ek-green-dark">
          <strong className="font-black">Drug Interaction Checker AI</strong> (v1.8, 98.1% accuracy) active. 
          <strong className="font-black ml-2">12,400 active medication reminders</strong> across the platform.
        </div>
      </div>

      <MedicationStats />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-transparent border-b border-slate-200 h-auto p-0 flex gap-0 mb-4 justify-start overflow-x-auto no-scrollbar">
          {MedTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 border-b-2 border-transparent transition-all rounded-none outline-none",
                "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-ek-green-dark data-[state=active]:border-ek-green-dark"
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="animate-in slide-in-from-bottom-2 duration-300">
          <TabsContent value="database"><DrugDatabaseTab /></TabsContent>
          <TabsContent value="logged"><LoggedRemindersTab /></TabsContent>
          <TabsContent value="adherence"><AdherenceTab /></TabsContent>
          <TabsContent value="interactions"><InteractionsTab /></TabsContent>
          <TabsContent value="ai"><AICheckerTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default MedicationReminderPage;
