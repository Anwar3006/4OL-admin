"use client";

import React from "react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
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
    <div className="animate-in fade-in duration-500 space-y-5">
      <PageHeader
        title="📊 Platform Dashboard"
        subtitle="4 Our Life · Real-time overview · Updated: just now"
      >
        <select className="fi">
          <option>📅 Last 30 Days</option>
          <option>Last 7 Days</option>
          <option>Last 90 Days</option>
          <option>This Year</option>
        </select>
        <button className="btn btn-secondary btn-sm">📥 Export</button>
        <button className="btn btn-secondary btn-sm">🔐 Security</button>
        <button className="btn btn-primary btn-sm">📣 Broadcast</button>
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
