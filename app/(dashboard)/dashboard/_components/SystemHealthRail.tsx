import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PlatformOverviewMetrics } from "./dashboard-types";

type Dot = "good" | "warn" | "crit" | "neutral";

const DOT_CLR: Record<Dot, string> = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  crit: "bg-red-500",
  neutral: "bg-slate-300 dark:bg-slate-600",
};

function Row({ dot, label, value, href }: { dot: Dot; label: string; value: React.ReactNode; href?: string }) {
  const content = (
    <div className="flex items-center gap-2.5 text-xs">
      <span className={cn("size-1.75 rounded-full shrink-0", DOT_CLR[dot])} />
      <span className="flex-1 min-w-0 text-slate-500 dark:text-slate-400 truncate">{label}</span>
      <span className="font-semibold text-slate-800 dark:text-slate-200 shrink-0">{value}</span>
    </div>
  );
  if (!href) return content;
  return (
    <Link href={href} className="block hover:opacity-80 transition-opacity">
      {content}
    </Link>
  );
}

export default function SystemHealthRail({
  metrics,
  loading,
  error,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
  error: boolean;
}) {
  const score = metrics?.kpis.security_score ?? null;
  const scoreDot: Dot = score == null ? "neutral" : score >= 80 ? "good" : score >= 50 ? "warn" : "crit";
  const openThreats = metrics?.queues.open_security_threats ?? 0;
  const revenueStatus = metrics?.finance.revenue_status;

  return (
    <Card>
      <CardHeader className="pb-1">
        <div className="text-sm font-semibold">System Health</div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        <Row
          dot={loading ? "neutral" : error ? "crit" : "good"}
          label="Dashboard data"
          value={loading ? "Checking" : error ? "Unavailable" : "Connected"}
        />
        <Row
          dot={revenueStatus === "live" ? "good" : "neutral"}
          label="Transaction pipeline"
          value={revenueStatus === "live" ? "Live" : "Awaiting pipeline"}
          href="/transactions"
        />
        <Row
          dot={scoreDot}
          label="Security score"
          value={score != null ? `${score}/100` : "Awaiting data"}
          href="/security"
        />
        <Row
          dot={openThreats > 0 ? "crit" : "good"}
          label="Open security threats"
          value={openThreats}
          href="/security"
        />
        <Row dot="neutral" label="Push notifications" value="See Notifications" href="/notifications" />
      </CardContent>
    </Card>
  );
}
