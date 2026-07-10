"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import AllListingsTab from "./_components/AllListingsTab";
import PostJobTab from "./_components/PostJobTab";
import ApplicantsTab from "./_components/ApplicantsTab";
import DigitalCVsTab from "./_components/DigitalCVsTab";
import PremiumServicesTab from "./_components/PremiumServicesTab";

const TabsConfig = [
  { id: "all", label: "💼 All Listings" },
  { id: "post", label: "📝 Post a Job" },
  { id: "applicants", label: "🗂️ Applicants" },
  { id: "cv", label: "📄 Digital CVs" },
  { id: "premium", label: "⭐ Premium Services" },
];

export default function JobsPage() {
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
    router.push(value === "all" ? "/jobs" : `/jobs?tab=${value}`, {
      scroll: false,
    });
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="💼 Jobs & Careers"
        subtitle="Healthcare job board · Professional opportunities · Digital CV management"
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-transparent border-b border-slate-200 h-auto p-0 flex gap-0 mb-4 justify-start overflow-x-auto no-scrollbar">
          {TabsConfig.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 border-b-2 border-transparent transition-all rounded-none outline-none",
                "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-ek-green-dark data-[state=active]:border-ek-green-dark",
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="animate-in slide-in-from-bottom-2 duration-300">
          <TabsContent value="all">
            <AllListingsTab />
          </TabsContent>
          <TabsContent value="post">
            <PostJobTab />
          </TabsContent>
          <TabsContent value="applicants">
            <ApplicantsTab />
          </TabsContent>
          <TabsContent value="cv">
            <DigitalCVsTab />
          </TabsContent>
          <TabsContent value="premium">
            <PremiumServicesTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
