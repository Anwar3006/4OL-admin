"use client";

/**
 * FacilityScout page — Gap Analysis Part N Phase 4 rebuild.
 * Community facility submissions, field-collector assignment, data-bundle
 * rewards, leaderboard and programme settings over /api/facilityscout.
 */

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  CopyX,
  FileText,
  Gift,
  Wifi,
} from "lucide-react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useFacilityScoutOverview,
  type FacilityScoutOverview,
} from "@/features/facility-scout/data/useFacilityScout";
import AllSubmissionsTab from "./AllSubmissionsTab";
import PendingReviewTab from "./PendingReviewTab";
import RewardsQueueTab from "./RewardsQueueTab";
import LeaderboardTab from "./LeaderboardTab";
import FacilityScoutSettingsTab from "./FacilityScoutSettingsTab";
import type { FacilityScoutTabProps } from "@/features/facility-scout/schema/types";

// Re-exported: the tabs used to import this from the page module itself.
export type { FacilityScoutTabProps };

const TABS = [
  { id: "submissions", label: "📲 All Submissions" },
  { id: "pending", label: "⏳ Pending Review" },
  { id: "rewards", label: "🎁 Rewards Queue" },
  { id: "leaderboard", label: "🏆 Leaderboard" },
  { id: "settings", label: "⚙️ Settings" },
];

export default function FacilityScoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "submissions");

  const { data, isLoading, isError, error, refetch, isFetching } =
    useFacilityScoutOverview();

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
  }, [tabParam, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(value === "submissions" ? "/facility-scout" : `/facility-scout?tab=${value}`, {
      scroll: false,
    });
  };

  const metrics = data?.metrics;
  const tabProps: FacilityScoutTabProps = { data, loading: isLoading };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="FacilityScout"
        subtitle="Community facility discovery — user submissions, field verification, data rewards"
      >
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "Refreshing..." : "Refresh"}
        </Button>
      </PageHeader>

      <Alert>
        <AlertDescription className="text-xs">
          Users submit unregistered facilities with GPS + photo. Field collectors verify on the
          ground; approved facilities earn mobile-data rewards. Max{" "}
          {data?.config?.max_pending_per_user ?? 10} pending submissions per user.
        </AlertDescription>
      </Alert>

      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Module data unavailable</AlertTitle>
          <AlertDescription>{error?.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard icon={<FileText className="h-5 w-5" />} label="Total Submissions" value={isLoading ? "..." : String(metrics?.totalSubmissions ?? 0)} variant="blue" delta="Community uploads" deltaType="neutral" />
        <KpiCard icon={<ClipboardList className="h-5 w-5" />} label="Pending Review" value={isLoading ? "..." : String(metrics?.scoutPending ?? 0)} variant="amber" delta="Needs action" deltaType="neutral" />
        <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} label="Facilities Added" value={isLoading ? "..." : String(metrics?.facilitiesAdded ?? 0)} variant="green" delta="Registered + rewarded" deltaType="up" />
        <KpiCard icon={<CopyX className="h-5 w-5" />} label="Duplicates" value={isLoading ? "..." : String(metrics?.duplicates ?? 0)} variant="red" delta="Matched existing" deltaType="down" />
        <KpiCard icon={<Gift className="h-5 w-5" />} label="Rewards Queue" value={isLoading ? "..." : String(metrics?.rewardsQueue ?? 0)} variant="purple" delta="Awaiting disbursement" deltaType="neutral" />
        <KpiCard icon={<Wifi className="h-5 w-5" />} label="Data Rewarded" value={isLoading ? "..." : `${metrics?.dataRewardedMb ?? 0} MB`} variant="blue" delta="Bundles sent" deltaType="up" />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-transparent border-b border-slate-200 h-auto p-0 flex gap-0 mb-4 justify-start overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-400 border-b-2 border-transparent transition-all rounded-none outline-none",
                "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-ek-green-dark data-[state=active]:border-ek-green-dark",
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="animate-in slide-in-from-bottom-2 duration-300">
          <TabsContent className="w-full min-w-0 outline-none" value="submissions"><AllSubmissionsTab {...tabProps} /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="pending"><PendingReviewTab {...tabProps} /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="rewards"><RewardsQueueTab {...tabProps} /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="leaderboard"><LeaderboardTab {...tabProps} /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="settings"><FacilityScoutSettingsTab {...tabProps} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
