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

  // Real 8-week submissions trend — `scout_submissions` is already fetched
  // whole by this same /api/facilityscout call (features/facility-scout/
  // api/overview.ts), ordered by its own created_at desc and capped at
  // 250, to back the "All Submissions" table below (AllSubmissionsTab).
  // created_at is the actual submission date, not a "last touched" proxy,
  // so bucketing it by week is genuine — the same pattern as the approved
  // fitness/subscriptions sparklines, not a new query. (The 250-row cap
  // would only undercount a week inside this window if that single week's
  // submissions exceeded ~250, far above current programme volume.)
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const weekBucket = (iso: string) => Math.floor(new Date(iso).getTime() / WEEK_MS);
  const submissionsByWeek = new Map<number, number>();
  for (const row of data?.scout_submissions ?? []) {
    if (!row.created_at) continue;
    const bucket = weekBucket(row.created_at);
    submissionsByWeek.set(bucket, (submissionsByWeek.get(bucket) ?? 0) + 1);
  }
  const currentWeekBucket = weekBucket(new Date().toISOString());
  const weekLabel = (bucket: number) =>
    `Week of ${new Date(bucket * WEEK_MS).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  const submissionsTrendPoints = Array.from({ length: 8 }, (_, i) => {
    const bucket = currentWeekBucket - (7 - i);
    return { label: weekLabel(bucket), value: submissionsByWeek.get(bucket) ?? 0 };
  });
  const lastWeekSubmissions = submissionsTrendPoints[submissionsTrendPoints.length - 1]?.value ?? 0;
  const prevWeekSubmissions = submissionsTrendPoints[submissionsTrendPoints.length - 2]?.value ?? 0;
  const submissionsWowPct =
    prevWeekSubmissions > 0
      ? Math.round(((lastWeekSubmissions - prevWeekSubmissions) / prevWeekSubmissions) * 100)
      : null;
  // "flat" (a real zero-change week-over-week) is a distinct amber signal
  // from "neutral" (no prior week to compare against at all).
  const submissionsDirection: "up" | "down" | "flat" | "neutral" =
    submissionsWowPct == null ? "neutral" : submissionsWowPct === 0 ? "flat" : submissionsWowPct > 0 ? "up" : "down";
  const submissionsDeltaText =
    submissionsWowPct != null
      ? submissionsWowPct === 0
        ? "No change vs last week"
        : `${Math.abs(submissionsWowPct)}% vs last week`
      : "8-week trend";

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
          Users submit unregistered facilities with GPS + photo. Registrars verify on the
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

      {/*
        Total Submissions is the one card here with a genuine dated series
        behind it (see the trend computation above), so it's the sole
        bento hero. Pending Review stays at default size next to it — it's
        the actionable queue depth ("Needs action") an admin checks daily —
        while the remaining four are snapshot counts with nothing to chart
        and go small. `deltaType` on Facilities Added / Duplicates / Data
        Rewarded was "up"/"down"/"up" on plain descriptive captions with no
        real prior-period comparison behind them — fixed to "neutral".
      */}
      <div className="space-y-4">
        <KpiCard
          icon={<FileText className="h-5 w-5" />}
          label="Total Submissions"
          value={isLoading ? "..." : String(metrics?.totalSubmissions ?? 0)}
          variant="blue"
          delta={submissionsDeltaText}
          deltaType={submissionsDirection}
          trend={submissionsTrendPoints}
          size="lg"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard icon={<ClipboardList className="h-5 w-5" />} label="Pending Review" value={isLoading ? "..." : String(metrics?.scoutPending ?? 0)} variant="amber" delta="Needs action" deltaType="neutral" />
          <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} label="Facilities Added" value={isLoading ? "..." : String(metrics?.facilitiesAdded ?? 0)} variant="green" delta="Registered + rewarded" deltaType="neutral" size="sm" />
          <KpiCard icon={<CopyX className="h-5 w-5" />} label="Duplicates" value={isLoading ? "..." : String(metrics?.duplicates ?? 0)} variant="red" delta="Matched existing" deltaType="neutral" size="sm" />
          <KpiCard icon={<Gift className="h-5 w-5" />} label="Rewards Queue" value={isLoading ? "..." : String(metrics?.rewardsQueue ?? 0)} variant="purple" delta="Awaiting disbursement" deltaType="neutral" size="sm" />
          <KpiCard icon={<Wifi className="h-5 w-5" />} label="Data Rewarded" value={isLoading ? "..." : `${metrics?.dataRewardedMb ?? 0} MB`} variant="blue" delta="Bundles sent" deltaType="neutral" size="sm" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-transparent border-b border-slate-200 dark:border-slate-700 h-auto p-0 flex gap-0 mb-4 justify-start overflow-x-auto no-scrollbar">
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
