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
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="📊 Platform Dashboard"
        subtitle="4 Our Life · Real-time overview · Updated: just now"
      >
        <div className="flex gap-2">
          <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white outline-none focus:ring-2 focus:ring-ek-green/20">
            <option>📅 Last 30 Days</option>
            <option>Last 7 Days</option>
            <option>Last 90 Days</option>
            <option>This Year</option>
          </select>
          <button className="btn btn-secondary btn-sm">📥 Export Report</button>
          <button className="btn btn-secondary btn-sm">🔐 Security</button>
          <button className="btn btn-primary btn-sm text-white font-black uppercase tracking-widest">📣 Broadcast</button>
        </div>
      </PageHeader>

      <CriticalAlerts />

      {/* Row 1: KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        <KpiCard icon="👥" label="Total Users" value="45,234" variant="blue" delta="+12.4%" deltaType="up" />
        <KpiCard icon="🏥" label="Active Facilities" value="1,287" variant="teal" delta="+5.2%" deltaType="up" />
        <KpiCard icon="💰" label="Revenue (MTD)" value="₵287K" variant="green" delta="+18.7%" deltaType="up" />
        <KpiCard icon="💳" label="Transactions" value="8,934" variant="purple" delta="+3.1%" deltaType="up" />
        <KpiCard icon="🤖" label="AI Queries/Day" value="23,450" variant="indigo" delta="+45.2%" deltaType="up" />
        <KpiCard icon="⭐" label="Premium Subs" value="4,812" variant="amber" delta="+8.2%" deltaType="up" />
        <KpiCard icon="👨‍⚕️" label="Registered HCPs" value="3,420" variant="pink" delta="+120" deltaType="up" />
        <KpiCard icon="🔐" label="Security Score" value="82/100" variant="red" delta="MFA Issue" deltaType="down" />
      </div>

      {/* Row 2: Chart + Health/Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <RevenueTrendChart />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
            <SystemHealth />
            <QuickActions />
        </div>
      </div>
      
      {/* Row 3: Streams + Users + Feature Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <RevenueStreams />
        <UsersByPlan />
        <FeatureUsage />
      </div>
      
      {/* Row 4: Activity + AI/Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityFeed />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6">
            <AIHubOverview />
            <RegionalCoverage />
        </div>
      </div>

      {/* Row 5: Features + Tasks + Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <HealthFeaturesStatus />
        <PendingTasks />
        <ComplianceGRA />
      </div>
    </div>
  );
};

export default DashboardPage;
