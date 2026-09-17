"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  RefreshCw,
  Shield,
  XCircle,
} from "lucide-react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Threat = {
  id: string;
  threat_level: "low" | "medium" | "high" | "critical";
  threat_type: string;
  title: string;
  description: string | null;
  source_module: string | null;
  source_ip: string | null;
  affected_users: number | null;
  status: "open" | "mitigated" | "monitoring" | "review" | "resolved" | "auto_resolved";
  created_at: string;
  resolved_at: string | null;
};

type AuditLog = {
  id: string;
  admin_email: string | null;
  action_type: string;
  target_table: string | null;
  record_id: string | null;
  description: string | null;
  severity: "info" | "warning" | "critical";
  created_at: string;
  ip_address: string | null;
};

type SecuritySettings = {
  password_policy: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
  session_timeout: number;
  max_login_attempts: number;
  lockout_duration: number;
  require_2fa: boolean;
  allowed_ips: string[];
  mfa_methods: string[];
  source: "stored" | "defaults";
};

const severityBadge = {
  low: "blue",
  medium: "amber",
  high: "destructive",
  critical: "destructive",
} as const;

const statusBadge = {
  open: "destructive",
  review: "amber",
  monitoring: "amber",
  mitigated: "emerald",
  resolved: "emerald",
  auto_resolved: "secondary",
} as const;

const auditBadge = {
  info: "blue",
  warning: "amber",
  critical: "destructive",
} as const;

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(seconds: number) {
  if (seconds >= 3600) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 60)}m`;
}

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState("threats");
  const [threats, setThreats] = useState<Threat[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const openThreats = useMemo(
    () => threats.filter((threat) => threat.status === "open"),
    [threats],
  );
  const criticalThreats = useMemo(
    () => threats.filter((threat) => threat.threat_level === "critical"),
    [threats],
  );
  const criticalAuditLogs = useMemo(
    () => auditLogs.filter((log) => log.severity === "critical"),
    [auditLogs],
  );

  const loadSecurityData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [threatsRes, logsRes, settingsRes] = await Promise.all([
        fetch("/api/security/threats?limit=25", { cache: "no-store" }),
        fetch("/api/security/audit-logs?limit=50", { cache: "no-store" }),
        fetch("/api/security/settings", { cache: "no-store" }),
      ]);

      if (!threatsRes.ok || !logsRes.ok || !settingsRes.ok) {
        throw new Error("Unable to load one or more security datasets.");
      }

      const [threatsJson, logsJson, settingsJson] = await Promise.all([
        threatsRes.json(),
        logsRes.json(),
        settingsRes.json(),
      ]);

      setThreats(threatsJson.threats ?? []);
      setAuditLogs(logsJson.logs ?? []);
      setSettings(settingsJson.security ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load security data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecurityData();
  }, [loadSecurityData]);

  const resolveThreat = async (
    id: string,
    action: "resolved" | "false_positive",
  ) => {
    setUpdatingId(id);
    setError(null);

    try {
      const res = await fetch("/api/security/threats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Unable to update threat status.");
      }

      await loadSecurityData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update threat.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="Security Center"
        subtitle="Access control, threat monitoring, audit trails, and platform hardening"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadSecurityData}
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </PageHeader>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Security data unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/*
        Threats, audit logs and security settings are all live-state reads
        (open counts, a capped latest-50 log, current policy config) — none
        of them retain the kind of dated, already-fetched history that
        Notifications' campaign log or WhatsApp's broadcasts do, so no card
        here gets a `trend`. Open Threats and Critical Threats are what an
        admin needs to act on first, so they keep the default size; Audit
        Events and 2FA Policy are supporting context and go "sm". None of
        these badges compare to a prior period either — they read the
        current state, so `deltaType` stays "neutral" throughout; severity
        still comes through via `variant`'s red/green/amber.
      */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Open Threats"
          value={loading ? "..." : openThreats.length}
          variant={openThreats.length > 0 ? "red" : "green"}
          delta={openThreats.length > 0 ? "Needs review" : "Clear"}
          deltaType="neutral"
        />
        <KpiCard
          icon={<Shield className="h-5 w-5" />}
          label="Critical Threats"
          value={loading ? "..." : criticalThreats.length}
          variant={criticalThreats.length > 0 ? "red" : "blue"}
          delta={criticalThreats.length > 0 ? "High priority" : "None open"}
          deltaType="neutral"
        />
        <KpiCard
          icon={<FileText className="h-5 w-5" />}
          label="Audit Events"
          value={loading ? "..." : auditLogs.length}
          variant="purple"
          delta="Latest 50"
          deltaType="neutral"
          size="sm"
        />
        <KpiCard
          icon={<Lock className="h-5 w-5" />}
          label="2FA Policy"
          value={settings?.require_2fa ? "Required" : "Optional"}
          variant={settings?.require_2fa ? "green" : "amber"}
          delta={settings?.source === "stored" ? "Stored config" : "Defaults"}
          deltaType="neutral"
          size="sm"
        />
      </div>

      {criticalAuditLogs.length > 0 && (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-500/15 text-red-900 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical audit activity detected</AlertTitle>
          <AlertDescription>
            {criticalAuditLogs.length} critical audit event
            {criticalAuditLogs.length === 1 ? "" : "s"} appear in the latest
            activity window.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none bg-transparent p-0">
            {[
              ["threats", "Threats"],
              ["audit", "Audit Logs"],
              ["settings", "Security Settings"],
            ].map(([id, label]) => (
              <TabsTrigger
                key={id}
                value={id}
                className="shrink-0 rounded-none border-b-2 border-transparent px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-400 data-[state=active]:border-emerald-700 dark:data-[state=active]:border-emerald-400 data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-none"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="threats" className="mt-5 outline-none">
          <ThreatsTable
            loading={loading}
            threats={threats}
            updatingId={updatingId}
            onResolve={resolveThreat}
          />
        </TabsContent>
        <TabsContent value="audit" className="mt-5 outline-none">
          <AuditLogTable loading={loading} logs={auditLogs} />
        </TabsContent>
        <TabsContent value="settings" className="mt-5 outline-none">
          <SecuritySettingsPanel loading={loading} settings={settings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ThreatsTable({
  loading,
  threats,
  updatingId,
  onResolve,
}: {
  loading: boolean;
  threats: Threat[];
  updatingId: string | null;
  onResolve: (id: string, action: "resolved" | "false_positive") => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
          Security Threats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Threat</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Detected</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <EmptyRow colSpan={6} label="Loading threats..." />}
            {!loading && threats.length === 0 && (
              <EmptyRow colSpan={6} label="No security threats detected." />
            )}
            {!loading &&
              threats.map((threat) => (
                <TableRow key={threat.id}>
                  <TableCell>
                    <Badge variant={severityBadge[threat.threat_level]}>
                      {threat.threat_level}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-[260px] whitespace-normal">
                    <div className="font-bold text-slate-800 dark:text-slate-200">{threat.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {threat.description || threat.threat_type}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {threat.source_module || "Unknown"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {threat.source_ip || "No IP"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadge[threat.status]}>
                      {threat.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDate(threat.created_at)}
                  </TableCell>
                  <TableCell>
                    {threat.status === "open" ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={updatingId === threat.id}
                          onClick={() => onResolve(threat.id, "false_positive")}
                        >
                          <XCircle className="h-4 w-4" />
                          False positive
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={updatingId === threat.id}
                          onClick={() => onResolve(threat.id, "resolved")}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Resolve
                        </Button>
                      </div>
                    ) : (
                      <span className="block text-right text-xs font-medium text-slate-400">
                        Closed
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AuditLogTable({
  loading,
  logs,
}: {
  loading: boolean;
  logs: AuditLog[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
          Admin Audit Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <EmptyRow colSpan={6} label="Loading audit logs..." />}
            {!loading && logs.length === 0 && (
              <EmptyRow colSpan={6} label="No audit logs recorded yet." />
            )}
            {!loading &&
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant={auditBadge[log.severity]}>
                      {log.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                    {log.action_type.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>{log.admin_email || "Unknown admin"}</TableCell>
                  <TableCell>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {log.target_table || "Platform"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {log.record_id || "No record"}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-sm whitespace-normal text-xs text-slate-500">
                    {log.description || "No details supplied"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    <Clock className="mr-1 inline h-3.5 w-3.5" />
                    {formatDate(log.created_at)}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SecuritySettingsPanel({
  loading,
  settings,
}: {
  loading: boolean;
  settings: SecuritySettings | null;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm font-medium text-slate-400">
          Loading security settings...
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No settings available</AlertTitle>
        <AlertDescription>
          Security settings could not be loaded from the API.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
            Password Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PolicyRow label="Minimum length" value={`${settings.password_policy.minLength} characters`} />
          <PolicyToggle label="Uppercase required" checked={settings.password_policy.requireUppercase} />
          <PolicyToggle label="Numbers required" checked={settings.password_policy.requireNumbers} />
          <PolicyToggle label="Symbols required" checked={settings.password_policy.requireSymbols} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
            Session Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PolicyRow label="Session timeout" value={formatDuration(settings.session_timeout)} />
          <PolicyRow label="Max login attempts" value={`${settings.max_login_attempts}`} />
          <PolicyRow label="Lockout duration" value={formatDuration(settings.lockout_duration)} />
          <PolicyToggle label="2FA required" checked={settings.require_2fa} />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
            Access Restrictions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PolicyRow
            label="Allowed IPs"
            value={
              settings.allowed_ips.length > 0
                ? settings.allowed_ips.join(", ")
                : "No IP allowlist configured"
            }
          />
          <PolicyRow
            label="MFA methods"
            value={
              settings.mfa_methods.length > 0
                ? settings.mfa_methods.join(", ")
                : "No MFA methods configured"
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

function PolicyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-3">
      <span className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <span className="text-right text-sm font-bold text-slate-700 dark:text-slate-300">{value}</span>
    </div>
  );
}

function PolicyToggle({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-3">
      <span className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <Switch checked={checked} disabled aria-label={label} />
    </div>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="h-32 text-center text-sm font-medium text-slate-400"
      >
        {label}
      </TableCell>
    </TableRow>
  );
}
