"use client";

import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { CreditCard, Dumbbell, Layers3, Sparkles } from "lucide-react";
import SubscriptionsTab from "@/features/fitness/ui/SubscriptionsTab";

export default function SubscriptionsPage() {
  return (
    <div className="w-full min-w-0 space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="🎟️ Subscriptions"
        subtitle="Manage access across Plasence, Fitness and future 4 Our Life services from one place."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard icon={<Layers3 className="size-4" />} label="Entire app" value="All services" variant="purple" delta="All-access subscriptions" />
        <KpiCard icon={<Dumbbell className="size-4" />} label="Fitness" value="Fitness only" variant="green" delta="Workout and Fitness access" />
        <KpiCard icon={<Sparkles className="size-4" />} label="Plasence" value="Cycle Pro" variant="pink" delta="Period Tracker access" />
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
        <CreditCard className="mr-2 inline size-4" />
        New paid features should add a service scope here instead of creating their own subscription page.
      </div>

      <SubscriptionsTab />
    </div>
  );
}
