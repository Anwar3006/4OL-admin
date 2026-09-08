"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MedicationStats from "./MedicationStats";
import DrugDatabaseTab from "./DrugDatabaseTab";
import LoggedRemindersTab from "./LoggedRemindersTab";
import AdherenceTab from "./AdherenceTab";
import InteractionsTab from "./InteractionsTab";
import AICheckerTab from "./AICheckerTab";

import { cn } from "@/lib/utils";
import ViewMedicationReminderDialog from "./view-medication-dialog";

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

  const goToAddDrug = () => {
    handleTabChange("database");
    // DrugDatabaseTab listens for this event to open its Add Drug dialog.
    window.setTimeout(
      () => window.dispatchEvent(new CustomEvent("medication:add-drug")),
      0,
    );
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-5">
      <PageHeader
        title="💊 Medication Reminder"
        subtitle="Drug database · Interaction checker · Dosage reminders · Prescription tracking"
      >
        {/* Header actions (mockup): Export · AI Settings · + Add Drug */}
        <button className="btn btn-secondary" onClick={() => handleTabChange("database")}>
          📥 Export
        </button>
        <button className="btn btn-secondary" onClick={() => handleTabChange("ai")}>
          🤖 AI Settings
        </button>
        <button className="btn btn-primary" onClick={goToAddDrug}>
          + Add Drug
        </button>
      </PageHeader>

      {/* KPI row */}
      <MedicationStats />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="border-b border-slate-200 dark:border-slate-700 mb-5 w-full overflow-hidden">
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
                  "text-2xs sm:text-xs font-black uppercase tracking-widest",
                  "text-slate-400 border-b-2 border-transparent",
                  "transition-all rounded-none outline-none cursor-pointer",
                  "hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/15/40",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-700 dark:data-[state=active]:border-emerald-400",
                )}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="animate-in slide-in-from-bottom-2 duration-300">
          <TabsContent className="w-full min-w-0 outline-none" value="database">     <DrugDatabaseTab />    </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="logged">       <LoggedRemindersTab /> </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="adherence">    <AdherenceTab />       </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="interactions"> <InteractionsTab />    </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="ai">           <AICheckerTab />       </TabsContent>
        </div>
      </Tabs>
      <ViewMedicationReminderDialog />
    </div>
  );
};

export default MedicationReminderPage;
