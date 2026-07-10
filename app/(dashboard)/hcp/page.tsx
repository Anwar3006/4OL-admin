"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import AllHCPTab from "./_components/AllHCPTab";
import PendingHCPTab from "./_components/PendingHCPTab";
import GroupChatsHCPTab from "./_components/GroupChatsHCPTab";

const TabsConfig = [
  { id: "all", label: "🧑‍⚕️ All" },
  { id: "pending", label: "⏳ Pending" },
  { id: "chats", label: "💬 Group Chats" },
];

export default function HCPPage() {
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
    router.push(value === "all" ? "/hcp" : `/hcp?tab=${value}`, {
      scroll: false,
    });
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="🧑‍⚕️ Healthcare Professionals"
        subtitle="HCP registry · Licensing verification · Professional group chats"
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
            <AllHCPTab />
          </TabsContent>
          <TabsContent value="pending">
            <PendingHCPTab />
          </TabsContent>
          <TabsContent value="chats">
            <GroupChatsHCPTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
