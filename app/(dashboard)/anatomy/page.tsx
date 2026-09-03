"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bone, HeartPulse, MapPin, ScanLine } from "lucide-react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnatomyOverview } from "@/hooks/supabase-calls/useAnatomy";
import BodyMapTab from "./_components/BodyMapTab";
import ConditionsLinkedTab from "./_components/ConditionsLinkedTab";
import SymptomsLinkedTab from "./_components/SymptomsLinkedTab";
import HealthyTipsTab from "./_components/HealthyTipsTab";
import DrugsLinkedTab from "./_components/DrugsLinkedTab";
import ConnectedModulesTab from "./_components/ConnectedModulesTab";
import BusinessStrategyTab from "./_components/BusinessStrategyTab";
import PinPlacement3DTab from "./_components/PinPlacement3DTab";
import AiPinMapperTab from "./_components/AiPinMapperTab";
import PremiumLayersTab from "./_components/PremiumLayersTab";
import AddBodyPartDialog from "./_components/AddBodyPartDialog";

import { cn } from "@/lib/utils";

const AnatomyTabs = [
  { id: "body-map",   label: "🪴 Body Map" },
  { id: "pins-3d",    label: "📍 3D Pin Placement" },
  { id: "ai-mapper",  label: "🤖 AI Pin Mapper" },
  { id: "premium",    label: "💎 Premium Layers" },
  { id: "drugs",      label: "💊 Linked Drugs" },
  { id: "conditions", label: "🦠 Linked Conditions" },
  { id: "symptoms",   label: "🩺 Linked Symptoms" },
  { id: "tips",       label: "🌿 Healthy Tips" },
  { id: "modules",    label: "🔗 Connected Modules" },
  { id: "strategy",   label: "💼 Business Strategy" },
];

export default function AnatomyPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "body-map");
  const [gender, setGender] = useState<"female" | "male">("female");
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
  }, [tabParam]);                                                    // eslint-disable-line

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", value);
    window.history.pushState(null, "", `?${params.toString()}`);
  };

  const { data: overview, isLoading: overviewLoading } = useAnatomyOverview();
  const stats = overview?.stats;

  return (
    <div className="animate-in fade-in duration-500 space-y-5">
      <PageHeader
        title="🧍 Human Anatomy"
        subtitle="Interactive body map · symptom & condition mapping · gender-aware content"
      >
        {/* Header actions (mockup): gender toggle · Export · + Add Body Part */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button
            className={cn(
              "px-3 py-2 text-xs font-bold transition",
              gender === "female"
                ? "bg-emerald-600 text-white"
                : "bg-white text-slate-500 hover:bg-slate-50",
            )}
            onClick={() => setGender("female")}
          >
            ♀ Female
          </button>
          <button
            className={cn(
              "px-3 py-2 text-xs font-bold transition",
              gender === "male"
                ? "bg-emerald-600 text-white"
                : "bg-white text-slate-500 hover:bg-slate-50",
            )}
            onClick={() => setGender("male")}
          >
            ♂ Male
          </button>
        </div>
        <button className="btn btn-secondary" onClick={() => handleTabChange("body-map")}>
          📥 Export
        </button>
        <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
          + Add Body Part
        </button>
      </PageHeader>

      {/* Mobile integration notice */}
      <div className="alert al-ok">
        <div className="al-ic">📱</div>
        <div className="flex-1 text-xs">
          <strong>Mobile integration:</strong> body-part taps are tracked via
          <code className="mx-1 rounded bg-slate-100 px-1 font-mono">anatomy_interactions</code>
          and feed the <strong>Map Interactions 30d</strong> KPI. Hotspot geometry is seeded in
          <code className="mx-1 rounded bg-slate-100 px-1 font-mono">anatomy_hotspots</code>
          (see migration <code className="rounded bg-slate-100 px-1 font-mono">anatomy_extension</code>).
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<ScanLine className="h-5 w-5" />}
          label="Body Parts Mapped"
          value={stats?.body_parts_mapped ?? "..."}
          variant="blue"
          delta={`${stats?.hotspots ?? 0} hotspots`}
          deltaType="neutral"
          isLoading={overviewLoading}
          isError={false}
        />
        <KpiCard
          icon={<HeartPulse className="h-5 w-5" />}
          label="Condition Links"
          value={stats?.condition_links ?? "..."}
          variant="teal"
          delta="Mapped links"
          deltaType="neutral"
          isLoading={overviewLoading}
        />
        <KpiCard
          icon={<Bone className="h-5 w-5" />}
          label="Symptom Links"
          value={stats?.symptom_links ?? "..."}
          variant="purple"
          delta={`${stats?.healthy_tip_links ?? 0} healthy tips`}
          deltaType="neutral"
          isLoading={overviewLoading}
        />
        <KpiCard
          icon={<MapPin className="h-5 w-5" />}
          label="Map Interactions 30d"
          value={stats?.map_interactions_30d ?? "..."}
          variant="green"
          delta="Mobile taps"
          deltaType="neutral"
          isLoading={overviewLoading}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="border-b border-slate-200 mb-5 w-full overflow-hidden">
          <TabsList
            className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start w-full overflow-x-auto overflow-y-hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {AnatomyTabs.map((tab) => (
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
          <TabsContent className="w-full min-w-0 outline-none" value="body-map">
            <BodyMapTab gender={gender} />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="pins-3d">
            <PinPlacement3DTab gender={gender} />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="ai-mapper">
            <AiPinMapperTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="premium">
            <PremiumLayersTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="drugs">
            <DrugsLinkedTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="conditions">
            <ConditionsLinkedTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="symptoms">
            <SymptomsLinkedTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="tips">
            <HealthyTipsTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="modules">
            <ConnectedModulesTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="strategy">
            <BusinessStrategyTab />
          </TabsContent>
        </div>
      </Tabs>

      <AddBodyPartDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
