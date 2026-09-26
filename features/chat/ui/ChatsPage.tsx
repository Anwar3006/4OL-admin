"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChatStats from "./ChatStats";
import GroupsTab from "./GroupsTab";
import SupportTab from "./SupportTab";
import FlaggedTab from "./FlaggedTab";
import ViewGroupDialog from "./ViewGroupDialog";
import CreateGroupDialog from "./CreateGroupDialog";
import { useChatTabCounts } from "@/features/chat/data/useConversation";
import { useAddGroupDialog } from "@/features/chat/data/dialog-hooks";
import { useHasPermission } from "@/stores/permission-context";
import { cn } from "@/lib/utils";

const ChatsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "groups");

  const { data: counts } = useChatTabCounts();
  const addGroupDialog = useAddGroupDialog();
  const canModerate = useHasPermission("chats.moderate");

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/chats?tab=${value}`, { scroll: false });
  };

  const TabsConfig = [
    {
      id: "groups",
      label: "💬 Groups",
      badge: counts?.total_groups ?? "...",
      badgeColor: "bg-emerald-500",
    },
    {
      id: "support",
      label: "🎟️ Support",
      badge: counts?.open_support ?? "...",
      badgeColor: "bg-slate-500",
    },
    {
      id: "flagged",
      label: "🚩 Flagged",
      badge: counts?.pending_flags ?? "...",
      badgeColor: "bg-red-500",
    },
  ];

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="💬 Chats"
        subtitle="Group chats management · User support tickets · Platform communication"
      >
        <div className="flex items-center gap-2">
          <a
            href="/support"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm font-black uppercase tracking-widest text-3xs"
          >
            Open support form ↗
          </a>
          {canModerate && (
            <button
              className="btn btn-primary btn-sm text-white font-black uppercase tracking-widest text-3xs"
              onClick={() => {
                setActiveTab("groups");
                addGroupDialog.open();
              }}
            >
              + New Group
            </button>
          )}
        </div>
      </PageHeader>

      {/* KPI stats */}
      <ChatStats />

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <div className="border-b border-slate-200 dark:border-slate-700 mb-5 w-full overflow-hidden">
          <TabsList
            className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start w-full overflow-x-auto overflow-y-hidden"
            style={
              {
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              } as React.CSSProperties
            }
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
                  "hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/15/40",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-700 dark:data-[state=active]:border-emerald-400",
                )}
              >
                {tab.label}
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      "ml-2 px-1.5 py-0 rounded-full text-3xs font-black text-white min-w-4 text-center shadow-sm",
                      tab.badgeColor || "bg-ek-orange",
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="animate-in slide-in-from-bottom-2 duration-300">
          <TabsContent className="w-full min-w-0 outline-none" value="groups">
            <GroupsTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="support">
            <SupportTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="flagged">
            <FlaggedTab />
          </TabsContent>
        </div>
      </Tabs>

      {/* Dialogs */}
      <ViewGroupDialog />
      <CreateGroupDialog />
    </div>
  );
};

export default ChatsPage;
