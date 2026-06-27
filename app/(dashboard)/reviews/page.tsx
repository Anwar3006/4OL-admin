"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReviewStats from "./_components/ReviewStats";
import ReviewsDataTab from "./_components/AllReviewsTab";
import { cn } from "@/lib/utils";

const TabsConfig = [
  { id: "all", label: "All Reviews" },
  { id: "flagged", label: "🚩 Flagged" },
  { id: "pending", label: "⏳ Pending" },
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
        subtitle="User reviews for facilities, doctors and services · Moderated by Support Agents"
      >
        {/* <button className="btn btn-secondary btn-sm font-bold">📥 Export PDF</button> */}
        {/* <button className="btn btn-primary btn-sm text-white font-black uppercase tracking-widest text-[9px]">🛡️ Moderate</button> */}
      </PageHeader>

      <ReviewStats />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-transparent border-b border-slate-200 h-auto p-0 flex gap-0 mb-4 justify-start overflow-x-auto no-scrollbar">
          {TabsConfig.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 border-b-2 border-transparent transition-all rounded-none outline-none cursor-pointer",
                "hover:bg-gray-400 hover:text-slate-600",
                "data-[state=active]:bg-gray-300 data-[state=active]:shadow-none data-[state=active]:text-zinc-800 data-[state=active]:border-ek-green-dark data-[state=active]:hover:bg-gray-400",
                
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="animate-in slide-in-from-bottom-2 duration-300">
          <TabsContent value="all">
            <ReviewsDataTab />
          </TabsContent>
          <TabsContent value="flagged">
            <ReviewsDataTab status="rejected" />
          </TabsContent>
          <TabsContent value="pending">
            <ReviewsDataTab status="pending" />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default ReviewsPage;
