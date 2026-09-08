"use client";

/**
 * Reports menu — scheduled AI-generated platform reports (daily → yearly)
 * covering users, traction, admin activity, security, finance, AI usage and
 * marketing. Super admins configure schedules + recipients; all admins with
 * reports.view see their inbox.
 */

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHasPermission } from "@/stores/permission-context";
import { cn } from "@/lib/utils";
import InboxTab from "./InboxTab";
import SchedulesTab from "./SchedulesTab";
import RecipientsTab from "./RecipientsTab";
import RunsTab from "./RunsTab";

const ReportsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const canManage = useHasPermission("reports.manage");

  const tabs = [
    { id: "inbox", label: "📥 My Reports" },
    ...(canManage
      ? [
          { id: "schedules", label: "🗓️ Schedules" },
          { id: "recipients", label: "👥 Recipients" },
          { id: "runs", label: "🕓 Run History" },
        ]
      : []),
  ];

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "inbox");

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
  }, [tabParam, activeTab]);

  // Guard: never sit on a manage-only tab when the viewer lacks reports.manage.
  useEffect(() => {
    if (!canManage && ["schedules", "recipients", "runs"].includes(activeTab)) {
      setActiveTab("inbox");
      router.push("/reports?tab=inbox", { scroll: false });
    }
  }, [canManage, activeTab, router]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/reports?tab=${value}`, { scroll: false });
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="📊 Reports"
        subtitle="Scheduled AI-generated reports on platform performance, traction, finance and security"
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="border-b border-slate-200 dark:border-slate-700 mb-5 w-full overflow-hidden">
          <TabsList
            className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start w-full overflow-x-auto overflow-y-hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {tabs.map((tab) => (
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
          <TabsContent className="w-full min-w-0 outline-none" value="inbox"><InboxTab /></TabsContent>
          {canManage ? (
            <>
              <TabsContent className="w-full min-w-0 outline-none" value="schedules"><SchedulesTab /></TabsContent>
              <TabsContent className="w-full min-w-0 outline-none" value="recipients"><RecipientsTab /></TabsContent>
              <TabsContent className="w-full min-w-0 outline-none" value="runs"><RunsTab /></TabsContent>
            </>
          ) : null}
        </div>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
