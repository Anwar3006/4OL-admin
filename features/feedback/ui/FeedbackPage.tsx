"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ModerationTab from "./ModerationTab";
import PipelineTab from "./PipelineTab";
import InsightsTab from "./InsightsTab";
import { useFeedbackKpi } from "../data/useFeedback";
import { cn } from "@/lib/utils";

// AF-02 — Feedback Board admin surface ("you said it, we built it" loop).
// Route entry: app/(dashboard)/feedback/page.tsx re-exports this component.

const TabsConfig = [
  { id: "moderation", label: "🛡️ Moderation" },
  { id: "pipeline", label: "🚦 Pipeline" },
  { id: "insights", label: "📈 Insights" },
];

function FeedbackStats() {
  const { data, isLoading } = useFeedbackKpi();
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <KpiCard
        icon="💡"
        label="Total Posts"
        value={isLoading ? "..." : (data?.total_posts ?? 0).toLocaleString()}
        variant="blue"
        delta={isLoading ? undefined : `${data?.posts_this_week ?? 0} this week`}
        deltaType="neutral"
      />
      <KpiCard
        icon="⏳"
        label="Pending Moderation"
        value={isLoading ? "..." : (data?.pending_moderation ?? 0).toLocaleString()}
        variant="gold"
        delta="Awaiting approval"
        deltaType="neutral"
      />
      <KpiCard
        icon="🚩"
        label="Flagged / Hidden"
        value={isLoading ? "..." : (data?.flagged ?? 0).toLocaleString()}
        variant="red"
        delta="Auto-hidden at 3 flags"
        deltaType="neutral"
      />
      <KpiCard
        icon="✅"
        label="Shipped From Ideas"
        value={isLoading ? "..." : (data?.shipped ?? 0).toLocaleString()}
        variant="green"
        delta="Marketing KPI"
        deltaType="neutral"
      />
    </div>
  );
}

const FeedbackPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "moderation");

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
  }, [tabParam, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/feedback?tab=${value}`, { scroll: false });
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="💡 Feedback Board"
        subtitle="Public reviews, suggestions & bugs · vote, moderate and ship ideas in the open"
      />

      <FeedbackStats />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="border-b border-slate-200 dark:border-slate-700 mb-5 w-full overflow-hidden">
          <TabsList
            className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start w-full overflow-x-auto overflow-y-hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {TabsConfig.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "shrink-0 whitespace-nowrap px-4 sm:px-5 py-2.5 sm:py-3",
                  "text-2xs sm:text-xs font-black uppercase tracking-widest",
                  "text-slate-400 border-b-2 border-transparent",
                  "transition-all rounded-none outline-none cursor-pointer",
                  "hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50/40",
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
          <TabsContent className="w-full min-w-0 outline-none" value="moderation">
            <ModerationTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="pipeline">
            <PipelineTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="insights">
            <InsightsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default FeedbackPage;
