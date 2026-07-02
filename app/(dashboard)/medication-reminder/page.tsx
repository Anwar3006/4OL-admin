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
import ViewMedicationReminderDialog from "./_components/view-medication-dialog";

const MedTabs = [
  { id: "database",     label: "💊 Drug Database" },
  { id: "logged",       label: "🔔 Logged Reminders" },
  { id: "adherence",    label: "📋 Adherence" },
  { id: "interactions", label: "⚠️ Interactions" },
  { id: "ai",           label: "🤖 AI Checker" },
];

const MedicationReminderPage = () => {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const tabParam     = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "database");

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
  }, [tabParam]);                                                    // eslint-disable-line

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", value);
    window.history.pushState(null, "", `?${params.toString()}`);
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-5">
      <PageHeader
        title="💊 Medication Reminder"
        subtitle="Drug database · Interaction checker · Dosage reminders · Prescription tracking"
      >
        {/* <button className="btn btn-secondary">📥 Export</button> */}
        {/* <button className="btn btn-secondary">🤖 AI Settings</button> */}
        {/* <button className="btn btn-primary">+ Add Drug</button> */}
      </PageHeader>

      {/* AI status banner - Completely remove, serves no purpose*/}
      {/* <div className="alert al-ok">
        <div className="al-ic">🔗</div>
        <div className="flex-1 text-xs">
          <strong>Drug Interaction Checker AI</strong> (v1.8, 98.1% accuracy) active. &nbsp;
          <strong>12,400 active medication reminders</strong> across the platform.
        </div>
      </div> */}

      {/* KPI row */}
      <MedicationStats />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="border-b border-slate-200 mb-5 w-full overflow-hidden">
          <TabsList
            className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start w-full overflow-x-auto overflow-y-hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {MedTabs.map((tab) => (
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
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="animate-in slide-in-from-bottom-2 duration-300">
          <TabsContent value="database">     <DrugDatabaseTab />    </TabsContent>
          <TabsContent value="logged">       <LoggedRemindersTab /> </TabsContent>
          <TabsContent value="adherence">    <AdherenceTab />       </TabsContent>
          <TabsContent value="interactions"> <InteractionsTab />    </TabsContent>
          <TabsContent value="ai">           <AICheckerTab />       </TabsContent>
        </div>
      </Tabs>
      <ViewMedicationReminderDialog />
    </div>
  );
};

export default MedicationReminderPage;
