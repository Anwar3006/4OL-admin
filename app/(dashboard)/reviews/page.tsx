"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReviewStats from "./_components/ReviewStats";
import AllReviewsTab, { ReviewRow } from "./_components/AllReviewsTab";
import FlaggedReviewsTab from "./_components/FlaggedReviewsTab";
import PendingReviewsTab from "./_components/PendingReviewsTab";
import { cn } from "@/lib/utils";
import { fetchFacilityRatings } from "@/app/services/fetchFacilityRatings";
import { useDebounce } from "@/hooks/use-debounce";

const TabsConfig = [
  { id: "all", label: "All Reviews" },
  { id: "flagged", label: "🚩 Flagged (12)" },
  { id: "pending", label: "⏳ Pending (3)" },
];

const ReviewsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "all");
  
  // Data management
  const [ratings, setRatings] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const fetchRatings = useCallback(async () => {
    setLoading(true);
    try {
      const from = (pageIndex - 1) * 10;
      const to = from + 9;
      const { ratings: fetchedRatings, count } = await fetchFacilityRatings(from, to, debouncedSearch);
      setRatings(fetchedRatings || []);
    } catch (error) {
      console.error("Failed to fetch ratings", error);
    } finally {
      setLoading(false);
    }
  }, [pageIndex, debouncedSearch]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

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
        <button className="btn btn-secondary btn-sm font-bold">📥 Export PDF</button>
        <button className="btn btn-primary btn-sm text-white font-black uppercase tracking-widest text-[9px]">🛡️ Moderate</button>
      </PageHeader>

      <ReviewStats />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-transparent border-b border-slate-200 h-auto p-0 flex gap-0 mb-4 justify-start overflow-x-auto no-scrollbar">
          {TabsConfig.map((tab) => (
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
          <TabsContent value="all">
            <AllReviewsTab 
                data={ratings} 
                loading={loading} 
                search={search} 
                setSearch={setSearch} 
            />
          </TabsContent>
          <TabsContent value="flagged"><FlaggedReviewsTab /></TabsContent>
          <TabsContent value="pending"><PendingReviewsTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default ReviewsPage;
