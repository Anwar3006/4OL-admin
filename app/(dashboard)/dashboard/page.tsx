"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { useHasPermission } from "@/stores/permission-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AlertStrip from "./_components/AlertStrip";
import PlatformActivityChart from "./_components/PlatformActivityChart";
import SystemHealthRail from "./_components/SystemHealthRail";
import QuickActionsRail from "./_components/QuickActionsRail";
import RevenueByService from "./_components/RevenueByService";
import SubscriberMix from "./_components/SubscriberMix";
import OperationsPanel from "./_components/OperationsPanel";
import FeatureCatalogueCard from "@/components/redesign/FeatureCatalogueCard";
import {
  deltaType,
  formatCount,
  formatCurrency,
  formatDelta,
  PlatformOverviewMetrics,
  TimeFilter,
} from "./_components/dashboard-types";

const filterLabels: Record<TimeFilter, string> = {
  "7": "Last 7 Days",
  "30": "Last 30 Days",
  "90": "Last 90 Days",
  year: "This Year",
};

const DashboardPage = () => {
  const router = useRouter();
  const canExport = useHasPermission("dashboard.export");
  const canViewUsers = useHasPermission("users.view");
  const canBroadcast = useHasPermission("notifications.create");
  const canExportUsers = useHasPermission("users.export");
  const canViewAi = useHasPermission("ai.view");
  const canViewTransactions = useHasPermission("transactions.view");
  const canViewFacilities = useHasPermission("facilities.view");
  const canViewHcp = useHasPermission("hcp.view");
  const canViewSecurity = useHasPermission("security.view");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("30");
  const [metrics, setMetrics] = useState<PlatformOverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async (filter: TimeFilter) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/dashboard/overview?timeFilter=${filter}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Unable to load dashboard metrics.");
      }
      const body = await res.json();
      setMetrics(body.metrics);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load dashboard metrics.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics(timeFilter);
  }, [loadMetrics, timeFilter]);

  const kpis = metrics?.kpis;

  // Merged fraction for the HCPs card (Rule 2's "Active / Total" precedent —
  // features/bed-tracker's "Facilities Online" card): operations.hcp_verifications
  // is every application regardless of status, verified_hcps is the subset
  // with verification_status='verified'. Showing both in one value is more
  // honest than the old "hcps" headline number, which actually counted
  // unverified applications too.
  const hcpTotal = kpis?.hcps ?? 0;
  const hcpVerified = metrics?.operations.verified_hcps ?? 0;
  const hcpVerifiedPct = hcpTotal > 0 ? Math.round((hcpVerified / hcpTotal) * 100) : null;

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-500">
      <PageHeader
        title="Platform Dashboard"
        subtitle={`4 Our Life overview · ${filterLabels[timeFilter]}`}
      >
        <Select
          value={timeFilter}
          onValueChange={(value) => setTimeFilter(value as TimeFilter)}
        >
          <SelectTrigger size="sm" className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={!canExport}
          title={canExport ? "Download dashboard CSV" : "Requires dashboard.export permission"}
          onClick={() => window.open("/api/dashboard/export", "_blank")}
        >
          Export
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href="/security">Security</a>
        </Button>
        <Button variant="default" size="sm" asChild>
          <a href="/notifications">Broadcast</a>
        </Button>
      </PageHeader>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Dashboard metrics unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <AlertStrip metrics={metrics} loading={loading} />

      {/*
        No trend on this row, for any card: every one of these 8 numbers was
        traced to get_platform_overview_metrics() (supabase/migrations/
        20260903_retire_fitness_users_table.sql) plus the queue counts
        route.ts merges in. The RPC returns a single current value per KPI,
        plus — for users/facilities/transactions/ai_calls/subscriptions
        only — a two-bucket current-vs-previous-window count for the delta
        badge (real, not fabricated). None of that is a dated, multi-point
        series. The only per-row dated data already fetched anywhere on
        this page is `activity` (10 most recent activity_logs rows, mixed
        action types, not scoped to any one KPI) — same trap OutdoorTab's
        comment warns about: too capped and un-scoped to bucket into a
        trustworthy weekly trend for any card here. `revenue_mtd`, `hcps`
        and `security_score` don't even have a real delta today (their
        badges are status/count labels, correctly `deltaType="neutral"`
        below, not a fabricated up/down). So: size="lg" and trend stay off
        for the whole row (Rule 1), and hierarchy instead comes from which
        3 numbers an admin needs first to gauge platform health — Total
        Users (growth), Revenue (MTD) (money) and Facilities (provider
        network coverage) — left at the default size; the other 5 are
        `size="sm"`.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-4 sm:gap-5">
        <KpiCard
          icon="👥"
          label="Total Users"
          value={formatCount(kpis?.total_users)}
          variant="blue"
          delta={formatDelta(metrics?.deltas.users)}
          deltaType={deltaType(metrics?.deltas.users)}
          isLoading={loading}
          isError={!!error}
          href={canViewUsers ? "/users" : undefined}
          menuItems={[
            ...(canViewUsers ? [{ label: "View Users", onClick: () => router.push("/users") }] : []),
            ...(canBroadcast ? [{ label: "Send Broadcast", onClick: () => router.push("/notifications") }] : []),
            ...(canExportUsers ? [{ label: "Export CSV", onClick: () => window.open("/api/admin/users/export", "_blank") }] : []),
            ...(canViewAi ? [{ label: "View Flags", onClick: () => router.push("/users?tab=flagged") }] : []),
          ]}
        />
        <KpiCard
          icon="🏥"
          label="Facilities"
          value={formatCount(kpis?.facilities)}
          variant="teal"
          delta={formatDelta(metrics?.deltas.facilities)}
          deltaType={deltaType(metrics?.deltas.facilities)}
          isLoading={loading}
          isError={!!error}
          href={canViewFacilities ? "/facilities" : undefined}
          menuItems={[
            ...(canViewFacilities
              ? [
                  { label: "View Facilities", onClick: () => router.push("/facilities") },
                  { label: "Pending Approvals", onClick: () => router.push("/facilities?status=pending") },
                ]
              : []),
          ]}
        />
        <KpiCard
          icon="💰"
          label="Revenue (MTD)"
          value={formatCurrency(kpis?.revenue_mtd)}
          variant="green"
          delta={metrics?.finance.revenue_status === "live" ? "Live" : "Awaiting pipeline"}
          deltaType="neutral"
          isLoading={loading}
          isError={!!error}
          isEmpty={!loading && !error && kpis?.revenue_mtd === null}
          href={canViewTransactions ? "/transactions" : undefined}
        />
        <KpiCard
          icon="💳"
          label="Transactions"
          value={formatCount(kpis?.transactions)}
          variant="purple"
          delta={formatDelta(metrics?.deltas.transactions)}
          deltaType={deltaType(metrics?.deltas.transactions)}
          isLoading={loading}
          isError={!!error}
          isEmpty={!loading && !error && kpis?.transactions === 0}
          emptyLabel="0"
          href={canViewTransactions ? "/transactions" : undefined}
          size="sm"
        />
        <KpiCard
          icon="🤖"
          label="AI Queries/Day"
          value={formatCount(kpis?.ai_queries_last_24h)}
          variant="indigo"
          delta={formatDelta(metrics?.deltas.ai_calls)}
          deltaType={deltaType(metrics?.deltas.ai_calls)}
          isLoading={loading}
          isError={!!error}
          isEmpty={!loading && !error && kpis?.ai_queries_last_24h === 0}
          emptyLabel="0"
          href={canViewAi ? "/ai" : undefined}
          menuItems={[
            ...(canViewAi
              ? [
                  { label: "AI Hub", onClick: () => router.push("/ai") },
                  { label: "Moderation Queue", onClick: () => router.push("/users?tab=flagged") },
                ]
              : []),
          ]}
          size="sm"
        />
        <KpiCard
          icon="⭐"
          label="Premium Subs"
          value={formatCount(kpis?.premium_subscriptions)}
          variant="amber"
          delta={formatDelta(metrics?.deltas.subscriptions)}
          deltaType={deltaType(metrics?.deltas.subscriptions)}
          isLoading={loading}
          isError={!!error}
          isEmpty={!loading && !error && kpis?.premium_subscriptions === 0}
          emptyLabel="0"
          href={canViewUsers ? "/users?tab=premium" : undefined}
          size="sm"
        />
        {/*
          Merged fraction (Rule 2's "Active / Total" precedent — see
          features/bed-tracker/ui/BedTrackerPage.tsx's "Facilities Online"
          card): operations.hcp_verifications counts every application
          regardless of status, verified_hcps is the verified subset. The
          old headline number (kpis.hcps) was that same unfiltered total
          labelled just "HCPs", which reads as "verified providers" but
          wasn't — this is both more honest and denser than a plain count
          plus a delta-badge aside.
        */}
        <KpiCard
          icon="👨‍⚕️"
          label="Verified / Total HCPs"
          value={`${hcpVerified.toLocaleString()} / ${hcpTotal.toLocaleString()}`}
          variant="pink"
          delta={hcpVerifiedPct != null ? `${hcpVerifiedPct}% verified` : "No applications yet"}
          deltaType="neutral"
          isLoading={loading}
          isError={!!error}
          isEmpty={!loading && !error && hcpTotal === 0}
          emptyLabel="0 / 0"
          href={canViewHcp ? "/hcp" : undefined}
          size="sm"
        />
        <KpiCard
          icon="🔐"
          label="Security Score"
          value={kpis?.security_score != null ? `${kpis.security_score}/100` : "Awaiting data"}
          variant="red"
          delta={`${metrics?.queues.open_security_threats ?? 0} open threats`}
          // "N open threats" is a descriptive caption, not a real
          // prior-period comparison (the score is computed fresh each
          // request in app/api/dashboard/overview/route.ts and never
          // persisted, so there's nothing to compare against) — "down"
          // here would fabricate a trend that isn't there. Same fix as
          // features/bed-tracker/ui/BedTrackerPage.tsx's Total Beds/Critical
          // Wards cards; the red variant already carries the urgency read.
          deltaType="neutral"
          isLoading={loading}
          isError={!!error}
          isEmpty={!loading && kpis?.security_score == null}
          href={canViewSecurity ? "/security" : undefined}
          menuItems={[
            ...(canViewSecurity ? [{ label: "Security Center", onClick: () => router.push("/security") }] : []),
          ]}
          size="sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <PlatformActivityChart metrics={metrics} loading={loading} rangeLabel={filterLabels[timeFilter]} />
        </div>
        <div className="flex flex-col gap-5">
          <SystemHealthRail metrics={metrics} loading={loading} error={!!error} />
          <QuickActionsRail />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RevenueByService metrics={metrics} loading={loading} />
        <SubscriberMix metrics={metrics} loading={loading} />
      </div>

      <OperationsPanel metrics={metrics} loading={loading} />

      <FeatureCatalogueCard
        title="Mobile features catalogue"
        description="The complete plain-English register of user-facing mobile services. Open a service to see what users should be able to do, the simplest way to confirm it is working, and clearly separated future ideas."
      />
    </div>
  );
};

export default DashboardPage;
