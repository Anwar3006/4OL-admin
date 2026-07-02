"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarketingStats from "./_components/MarketingStats";
import AllCampaignsTab from "./_components/AllCampaignsTab";
import AnalyticsTab from "./_components/AnalyticsTab";
import LinkagesTab from "./_components/LinkagesTab";
import SubscriptionsTab from "./_components/SubscriptionsTab";
import DiscountsTab from "./_components/DiscountsTab";

import { ViewMarketingDialog } from "./_components/view-marketing-dialog";
import { cn } from "@/lib/utils";
import AddMarketingDialog from "./_components/add-marketing-dialog";

const MktTabs = [
  { id: "all", label: "📣 All Campaigns" },
  { id: "subscriptions", label: "💎 Subscriptions" },
  { id: "discounts", label: "🏷️ Discounts" },
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
        <button className="btn btn-primary text-white font-black uppercase tracking-widest text-[9px]">+ New Campaign</button>
      </PageHeader>

      <MarketingStats />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="border-b border-slate-200 mb-5 w-full overflow-hidden">
          <TabsList
            className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start w-full overflow-x-auto overflow-y-hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {MktTabs.map((tab) => (
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
          <TabsContent value="all"><AllCampaignsTab /></TabsContent>
          <TabsContent value="subscriptions"><SubscriptionsTab /></TabsContent>
          <TabsContent value="discounts"><DiscountsTab /></TabsContent>
          <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
          <TabsContent value="linkages"><LinkagesTab /></TabsContent>
        </div>
      </Tabs>
      <AddMarketingDialog />
      <ViewMarketingDialog />
    </div>
  );
};

export default MarketingPage;
