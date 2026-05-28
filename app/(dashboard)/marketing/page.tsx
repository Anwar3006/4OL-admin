"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarketingStats from "./_components/MarketingStats";
import AllCampaignsTab from "./_components/AllCampaignsTab";
import AnalyticsTab from "./_components/AnalyticsTab";
import LinkagesTab from "./_components/LinkagesTab";
import { cn } from "@/lib/utils";

const MktTabs = [
  { id: "all", label: "📣 All Campaigns" },
  { id: "analytics", label: "📊 Analytics" },
  { id: "linkages", label: "🔗 Page Linkages" },
];

const MarketingPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "all");

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/marketing?tab=${value}`, { scroll: false });
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="📣 Marketing Campaigns"
        subtitle="Campaigns, promotions and user acquisition managed by Marketing Manager"
      >
        <button className="btn btn-secondary btn-sm">📋 Analytics Report</button>
        <button className="btn btn-secondary btn-sm">📋 Review Submissions</button>
        <button className="btn btn-primary text-white font-black uppercase tracking-widest">+ New Campaign</button>
      </PageHeader>

      <MarketingStats />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-transparent border-b border-slate-200 h-auto p-0 flex gap-0 mb-4 justify-start overflow-x-auto no-scrollbar">
          {MktTabs.map((tab) => (
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
          <TabsContent value="all"><AllCampaignsTab /></TabsContent>
          <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
          <TabsContent value="linkages"><LinkagesTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default MarketingPage;
