"use client";

import React from "react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
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

const DashboardPage = () => {
  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-500">
      <PageHeader
        title="📊 Platform Dashboard"
        subtitle="4 Our Life · Real-time overview · Updated: just now"
      >
        <Select defaultValue="30">
          <SelectTrigger size="sm" className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">📅 Last 7 Days</SelectItem>
            <SelectItem value="30">📅 Last 30 Days</SelectItem>
            <SelectItem value="90">📅 Last 90 Days</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm">
          📥 Export
        </Button>
        <Button variant="outline" size="sm">
          🔐 Security
        </Button>
        <Button variant="default" size="sm">
          📣 Broadcast
        </Button>
      </PageHeader>

      <CriticalAlerts />

      {/* Row 1: KPI Grid — 1 on mobile, 2 on sm, 4 on lg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-4 sm:gap-5">
        <KpiCard
          icon="👥"
          label="Total Users"
          value={0}
          variant="blue"
          delta="+12.4%"
          deltaType="up"
        />
        <KpiCard
          icon="🏥"
          label="Facilities"
          value={0}
          variant="teal"
          delta="+5.2%"
          deltaType="up"
        />
        <KpiCard
          icon="💰"
          label="Revenue (MTD)"
          value={0}
          variant="green"
          delta="+18.7%"
          deltaType="up"
        />
        <KpiCard
          icon="💳"
          label="Transactions"
          value={0}
          variant="purple"
          delta="+3.1%"
          deltaType="up"
        />
        <KpiCard
          icon="🤖"
          label="AI Queries/Day"
          value={0}
          variant="indigo"
          delta="+45.2%"
          deltaType="up"
        />
        <KpiCard
          icon="⭐"
          label="Premium Subs"
          value={0}
          variant="amber"
          delta="+8.2%"
          deltaType="up"
        />
        <KpiCard
          icon="👨‍⚕️"
          label="HCPs"
          value={0}
          variant="pink"
          delta="+120"
          deltaType="up"
        />
        <KpiCard
          icon="🔐"
          label="Security Score"
          value={0}
          variant="red"
          delta="MFA Issue"
          deltaType="down"
        />
      </div>

      {/* Row 2: Revenue chart + Health + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <RevenueTrendChart />
        </div>
        <div className="flex flex-col gap-5">
          <SystemHealth />
          <QuickActions />
        </div>
      </div>

      {/* Row 3: Streams + Users + Feature Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <RevenueStreams />
        <UsersByPlan />
        <FeatureUsage />
      </div>

      {/* Row 4: Activity + AI + Regional */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ActivityFeed />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <AIHubOverview />
          <RegionalCoverage />
        </div>
      </div>

      {/* Row 5: Health features + Tasks + Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <HealthFeaturesStatus />
        <PendingTasks />
        <ComplianceGRA />
      </div>
    </div>
  );
};

export default DashboardPage;
