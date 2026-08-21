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
import CriticalAlerts from "./_components/CriticalAlerts";
import RevenueTrendChart from "./_components/RevenueTrendChart";
import SystemHealth from "./_components/SystemHealth";
import QuickActions from "./_components/QuickActions";
import RevenueStreams from "./_components/RevenueStreams";
import UsersByPlan from "./_components/UsersByPlan";
import FeatureUsage from "./_components/FeatureUsage";
import ActivityFeed from "./_components/ActivityFeed";
import AIHubOverview from "./_components/AIHubOverview";
import RegionalCoverage from "./_components/RegionalCoverage";
import HealthFeaturesStatus from "./_components/HealthFeaturesStatus";
import PendingTasks from "./_components/PendingTasks";
import ComplianceGRA from "./_components/ComplianceGRA";
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

      <CriticalAlerts metrics={metrics} loading={loading} />

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
        />
        <KpiCard
          icon="👨‍⚕️"
          label="HCPs"
          value={formatCount(kpis?.hcps)}
          variant="pink"
          delta={`${metrics?.operations.verified_hcps ?? 0} verified`}
          deltaType="neutral"
          isLoading={loading}
          isError={!!error}
          isEmpty={!loading && !error && kpis?.hcps === 0}
          emptyLabel="0"
          href={canViewHcp ? "/hcp" : undefined}
        />
        <KpiCard
          icon="🔐"
          label="Security Score"
          value={kpis?.security_score != null ? `${kpis.security_score}/100` : "Awaiting data"}
          variant="red"
          delta={`${metrics?.queues.open_security_threats ?? 0} open threats`}
          deltaType={metrics?.queues.open_security_threats ? "down" : "neutral"}
          isLoading={loading}
          isError={!!error}
          isEmpty={!loading && kpis?.security_score == null}
          href={canViewSecurity ? "/security" : undefined}
          menuItems={[
            ...(canViewSecurity ? [{ label: "Security Center", onClick: () => router.push("/security") }] : []),
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <RevenueTrendChart metrics={metrics} loading={loading} />
        </div>
        <div className="flex flex-col gap-5">
          <SystemHealth metrics={metrics} loading={loading} />
          <QuickActions />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <RevenueStreams metrics={metrics} loading={loading} />
        <UsersByPlan metrics={metrics} loading={loading} />
        <FeatureUsage loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ActivityFeed metrics={metrics} loading={loading} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AIHubOverview metrics={metrics} loading={loading} />
          <RegionalCoverage metrics={metrics} loading={loading} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <HealthFeaturesStatus metrics={metrics} loading={loading} />
        <PendingTasks metrics={metrics} loading={loading} />
        <ComplianceGRA loading={loading} />
      </div>
    </div>
  );
};

export default DashboardPage;
