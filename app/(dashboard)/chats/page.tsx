"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChatStats from "./_components/ChatStats";
import GroupsTab from "./_components/GroupsTab";
import SupportTab from "./_components/SupportTab";
import FlaggedTab from "./_components/FlaggedTab";
import { cn } from "@/lib/utils";

const TabsConfig = [
  { id: "groups", label: "💬 Groups (48)" },
  { id: "support", label: "🎟️ Support", badge: "5" },
  { id: "flagged", label: "🚩 Flagged", badge: "3", badgeColor: "bg-red-500" },
];

const ChatsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "groups");

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/chats?tab=${value}`, { scroll: false });
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="💬 Chats"
        subtitle="Group chats management · User support tickets · Platform communication"
      >
        <button className="btn btn-secondary btn-sm font-bold">📥 Export</button>
        <button className="btn btn-primary btn-sm text-white font-black uppercase tracking-widest text-[9px]">+ New Group</button>
      </PageHeader>

      <div className="alert bg-ek-green/5 border border-ek-green/20 text-[11px] font-medium p-3 rounded-xl flex items-start gap-2.5">
        <span className="text-base leading-none mt-0.5 text-ek-green-dark">🔗</span>
        <div className="flex-1 text-ek-green-dark">
          <strong className="font-black">SA: Module Connections</strong> — Chats is connected to HCP Group Chats, Users, Facilities, and Notifications.
        </div>
      </div>

      <ChatStats />

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
              {tab.badge && (
                  <span className={cn(
                    "ml-2 px-1.5 py-0 rounded-full text-[9px] font-black text-white min-w-[16px] text-center shadow-sm",
                    tab.badgeColor || "bg-ek-orange"
                  )}>
                    {tab.badge}
                  </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="animate-in slide-in-from-bottom-2 duration-300">
          <TabsContent value="groups"><GroupsTab /></TabsContent>
          <TabsContent value="support"><SupportTab /></TabsContent>
          <TabsContent value="flagged"><FlaggedTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default ChatsPage;
