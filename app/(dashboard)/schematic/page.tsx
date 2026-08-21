"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Database,
  GitBranch,
  LayoutGrid,
  Lock,
  Package,
  RefreshCw,
  ScrollText,
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

type HealthPayload = {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  latencyMs: number;
  services?: Record<string, string>;
};

type SchematicResponse = {
  health: HealthPayload;
  stack: { app: string; node?: string; deps: { name: string; version: string }[] };
  migrations: { count: number; latest: string | null };
  rbac: { permissionCount: number; roleCount: number; roles: string[] };
  build: { commit: string | null; env: string; generatedAt: string };
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
  const [schematic, setSchematic] = useState<SchematicResponse | null>(null);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDenied(false);

    try {
      const res = await fetch("/api/admin/schematic", { cache: "no-store" });

      if (res.status === 401 || res.status === 403) {
        setDenied(true);
        setSchematic(null);
        return;
      }

      const body = await res.json().catch(() => null);
      if (!res.ok || !body) {
        throw new Error(body?.error || "Schematic check failed.");
      }
      setSchematic(body as SchematicResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Schematic check failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const health = schematic?.health ?? null;

  const services = useMemo(
    () => Object.entries(health?.services ?? {}),
    [health],
  );
  const configuredServices = services.filter(([, status]) =>
    ["healthy", "configured"].includes(status),
  ).length;

  if (denied) {
    return (
      <div className="animate-in fade-in duration-500 space-y-6">
        <PageHeader
          title="Platform Schematic"
          subtitle="System architecture, service health, and dependency map"
        />
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Access restricted</AlertTitle>
          <AlertDescription>
            The platform schematic is limited to super administrators because it
            exposes infrastructure configuration details.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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
          onClick={load}
          disabled={loading}
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </PageHeader>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Schematic issue</AlertTitle>
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

      {/* Auto-derived sections (Part Y-D3): values are computed server-side at
          request time from package.json, the RBAC catalog, the migrations
          directory, and the build environment — nothing is hard-coded. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-700">
              <Package className="h-4 w-4" /> Tech Stack
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && !schematic && (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                Loading...
              </div>
            )}
            {schematic && (
              <>
                {schematic.stack.deps.map((dep) => (
                  <div
                    key={dep.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium text-slate-700">{dep.name}</span>
                    <span className="font-mono text-xs text-slate-500">
                      v{dep.version}
                    </span>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-700">
              <ShieldCheck className="h-4 w-4" /> RBAC Model
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && !schematic && (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                Loading...
              </div>
            )}
            {schematic && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-200 p-3 text-center">
                    <div className="text-2xl font-black text-slate-800">
                      {schematic.rbac.roleCount}
                    </div>
                    <div className="text-xs font-semibold uppercase text-slate-500">
                      Roles
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 text-center">
                    <div className="text-2xl font-black text-slate-800">
                      {schematic.rbac.permissionCount}
                    </div>
                    <div className="text-xs font-semibold uppercase text-slate-500">
                      Permissions
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {schematic.rbac.roles.map((role) => (
                    <Badge key={role} variant="outline" className="text-xs">
                      {role}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-700">
              <ScrollText className="h-4 w-4" /> Platform Build
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {loading && !schematic && (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                Loading...
              </div>
            )}
            {schematic && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">App version</span>
                  <span className="font-mono text-xs text-slate-700">
                    v{schematic.stack.app}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Migrations</span>
                  <span className="font-semibold text-slate-700">
                    {schematic.migrations.count} applied
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Latest migration</span>
                  <span
                    className="max-w-[180px] truncate font-mono text-xs text-slate-700"
                    title={schematic.migrations.latest ?? undefined}
                  >
                    {schematic.migrations.latest ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Environment</span>
                  <Badge variant="outline">{schematic.build.env}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Commit</span>
                  <span className="font-mono text-xs text-slate-700">
                    {schematic.build.commit ?? "local"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Generated</span>
                  <span className="text-xs text-slate-700">
                    {new Date(schematic.build.generatedAt).toLocaleTimeString()}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
