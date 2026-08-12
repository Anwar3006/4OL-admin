"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Database,
  GitBranch,
  LayoutGrid,
  RefreshCw,
  Server,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type HealthResponse = {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  latencyMs: number;
  services?: Record<string, string>;
};

const architecture = [
  {
    name: "Admin Web",
    detail: "Next.js App Router dashboard, protected by Supabase session + role gate.",
    icon: LayoutGrid,
  },
  {
    name: "API Routes",
    detail: "Server-only route handlers for admin operations, analytics, AI, and settings.",
    icon: Server,
  },
  {
    name: "Supabase",
    detail: "Postgres, Auth, Storage, RLS policies, RPCs, and service-role admin reads.",
    icon: Database,
  },
  {
    name: "External Services",
    detail: "Firebase, Twilio, Resend, Paystack, Google Maps, and Gemini via env configuration.",
    icon: GitBranch,
  },
];

export default function SchematicPage() {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setHealth(body);
        throw new Error(body?.status || "Health check failed.");
      }

      setHealth(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Health check failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  const services = useMemo(
    () => Object.entries(health?.services ?? {}),
    [health],
  );
  const configuredServices = services.filter(([, status]) =>
    ["healthy", "configured"].includes(status),
  ).length;

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="Platform Schematic"
        subtitle="System architecture, service health, and dependency map"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadHealth}
          disabled={loading}
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </PageHeader>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Health check issue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Server className="h-5 w-5" />}
          label="API Status"
          value={loading ? "..." : health?.status ?? "unknown"}
          variant={health?.status === "healthy" ? "green" : "amber"}
          delta="Live check"
          deltaType={health?.status === "healthy" ? "up" : "neutral"}
        />
        <KpiCard
          icon={<Database className="h-5 w-5" />}
          label="Supabase"
          value={loading ? "..." : health?.services?.supabase ?? "unknown"}
          variant={health?.services?.supabase === "healthy" ? "green" : "red"}
          delta={`${health?.latencyMs ?? 0}ms`}
          deltaType="neutral"
        />
        <KpiCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Configured Services"
          value={loading ? "..." : configuredServices}
          variant="blue"
          delta={`${services.length} tracked`}
          deltaType="neutral"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Last Check"
          value={
            loading || !health?.timestamp
              ? "..."
              : new Date(health.timestamp).toLocaleTimeString()
          }
          variant="purple"
          delta="Current session"
          deltaType="neutral"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">
              Architecture Map
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {architecture.map((item) => (
              <div
                key={item.name}
                className="flex gap-3 rounded-lg border border-slate-200 p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">{item.name}</div>
                  <div className="mt-1 text-sm text-slate-500">{item.detail}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">
              Service Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-400">
                Checking services...
              </div>
            )}
            {!loading &&
              services.map(([name, status]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                >
                  <span className="text-sm font-bold capitalize text-slate-700">
                    {name.replace(/([A-Z])/g, " $1")}
                  </span>
                  <Badge
                    variant={
                      ["healthy", "configured"].includes(status)
                        ? "emerald"
                        : status === "missing"
                          ? "amber"
                          : "destructive"
                    }
                  >
                    {status}
                  </Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
