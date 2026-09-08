"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Clock,
  Database,
  Flag,
  RefreshCw,
  Send,
  ShieldAlert,
} from "lucide-react";
import KpiCard from "@/components/redesign/KpiCard";
import KpiGrid from "@/components/redesign/KpiGrid";
import PageHeader from "@/components/redesign/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DevOpsHealth = {
  supabase: { reachable: boolean; latency_ms: number; error: string | null };
  api: { node_env: string; uptime_secs: number };
  queues: {
    scheduled_campaigns: number;
    failed_campaigns: number;
    pending_moderation_flags: number;
  };
  generated_at: string;
};

function formatUptime(secs: number) {
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/**
 * DevOps monitoring (Gap Analysis Part U). Read-only telemetry from live
 * sources only (U-D4); no restart/scale/purge controls ever (U-D2). The page
 * is visible only to devops.view holders (super_admin) — everyone else gets
 * neither the sidebar entry nor this data (route returns 403).
 */
export default function DevOpsPage() {
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState<string | null>(null);
  const [health, setHealth] = useState<DevOpsHealth | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setDenied(null);
    try {
      const res = await fetch("/api/devops/health", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setDenied(json.error || "You need the devops.view permission to see infrastructure telemetry.");
        return;
      }
      if (!res.ok) throw new Error(json.error || "Failed to load DevOps telemetry.");
      setHealth(json);
    } catch (err) {
      setDenied(err instanceof Error ? err.message : "Failed to load DevOps telemetry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (denied) {
    return (
      <div className="space-y-6">
        <PageHeader title="DevOps" subtitle="Infrastructure telemetry" />
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-500/15 text-amber-900">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Restricted</AlertTitle>
          <AlertDescription>{denied}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="DevOps"
        subtitle="Read-only infrastructure telemetry — mutations stay in the Vercel / Supabase consoles"
      >
        <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </PageHeader>

      <KpiGrid>
        <KpiCard
          icon={<Database className="size-4" />}
          label="Supabase"
          value={loading ? "..." : health?.supabase.reachable ? "Reachable" : "Down"}
          variant={health?.supabase.reachable ? "green" : "red"}
          delta={loading ? "" : `${health?.supabase.latency_ms ?? 0} ms round-trip`}
          deltaType={health?.supabase.reachable ? "up" : "down"}
        />
        <KpiCard
          icon={<Activity className="size-4" />}
          label="API uptime"
          value={loading ? "..." : formatUptime(health?.api.uptime_secs ?? 0)}
          variant="blue"
          delta={health?.api.node_env ?? ""}
          deltaType="neutral"
        />
        <KpiCard
          icon={<Send className="size-4" />}
          label="Scheduled sends"
          value={loading ? "..." : health?.queues.scheduled_campaigns ?? 0}
          variant="purple"
          delta={`${health?.queues.failed_campaigns ?? 0} failed`}
          deltaType="neutral"
        />
        <KpiCard
          icon={<Flag className="size-4" />}
          label="Moderation queue"
          value={loading ? "..." : health?.queues.pending_moderation_flags ?? 0}
          variant="amber"
          delta="Pending review"
          deltaType="neutral"
        />
      </KpiGrid>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            External consoles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Infrastructure changes (deploys, scaling, cache purges, secrets) are
            intentionally not exposed here — use the provider consoles:
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="https://vercel.com/dashboard" target="_blank" rel="noreferrer">
              <Button type="button" variant="outline" size="sm">
                Vercel Dashboard <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">
              <Button type="button" variant="outline" size="sm">
                Supabase Dashboard <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/security" >
              <Button type="button" variant="outline" size="sm">
                Security Center <Clock className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          {health && (
            <div className="flex items-center gap-2 pt-2 text-xs text-slate-400">
              <Badge variant="secondary">Live</Badge>
              Telemetry generated at {new Date(health.generated_at).toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
