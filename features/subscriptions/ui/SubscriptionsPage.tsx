"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import OverviewTab from "./OverviewTab";
import PlansTab from "./PlansTab";
import SubscribersTab from "./SubscribersTab";
import RequestsTab from "./RequestsTab";
import ProviderPlansTab from "./ProviderPlansTab";

/**
 * Subscription-plan management, consolidated from four surfaces into this
 * one page (Marketing's Subscriptions tab, Settings' Plans tab, Fitness's
 * Subscriptions tab, and this page's own half-built KPI shell) — see
 * features/subscriptions/README.md for the full map of what moved from
 * where and why.
 */
const SubTabs = [
  { id: "overview", label: "📊 Overview" },
  { id: "plans", label: "🗂️ Plans" },
  { id: "provider-plans", label: "🏢 Provider plans" },
  { id: "subscribers", label: "👥 Subscribers" },
  { id: "requests", label: "🎫 Requests" },
];

export default function SubscriptionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "overview");

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/subscriptions?tab=${value}`, { scroll: false });
  };

  return (
    <div className="w-full min-w-0 space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="🎟️ Subscriptions"
        subtitle="Manage access across Plasence, Fitness and future 4 Our Life services from one place."
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="border-b border-slate-200 dark:border-slate-700 mb-5 w-full overflow-hidden">
          <TabsList
            className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start w-full overflow-x-auto overflow-y-hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {SubTabs.map((tab) => (
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
          <TabsContent className="w-full min-w-0 outline-none" value="overview"><OverviewTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="plans"><PlansTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="provider-plans"><ProviderPlansTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="subscribers"><SubscribersTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="requests"><RequestsTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
