"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReviewStats from "./_components/ReviewStats";
import ReviewsDataTab from "./_components/AllReviewsTab";
import AppReviewsTab from "./_components/AppReviewsTab";
import { cn } from "@/lib/utils";

const TabsConfig = [
  { id: "all", label: "All Reviews" },
  { id: "flagged", label: "🚩 Flagged" },
  { id: "pending", label: "⏳ Pending" },
  { id: "app", label: "📱 App Reviews" },
];

const ReviewsPage = () => {
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
    router.push(`/reviews?tab=${value}`, { scroll: false });
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="⭐ Reviews & Ratings"
        subtitle="User reviews for facilities, doctors, services and the app itself · Moderated by Support Agents"
      >
        {/* <button className="btn btn-secondary btn-sm font-bold">📥 Export PDF</button> */}
        {/* <button className="btn btn-primary btn-sm text-white font-black uppercase tracking-widest text-[9px]">🛡️ Moderate</button> */}
      </PageHeader>

      <ReviewStats />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="border-b border-slate-200 mb-5 w-full overflow-hidden">
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
          <TabsContent className="w-full min-w-0 outline-none" value="all">
            <ReviewsDataTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="flagged">
            <ReviewsDataTab status="rejected" />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="pending">
            <ReviewsDataTab status="pending" />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="app">
            <AppReviewsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default ReviewsPage;
