"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHasPermission } from "@/stores/permission-context";
import { formatCurrency } from "@/lib/format";
import { PlatformOverviewMetrics } from "./dashboard-types";

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// ── Column 1: Recent Activity ──────────────────────────────────────────
// activity_logs frequently has back-to-back identical rows (the same
// automated job touching the same table repeatedly) — showing all of them
// separately reads as broken/repetitive, not as more information. Collapse
// consecutive rows that share the same actor + action + table into one
// line with a count, keeping the most recent timestamp — still exactly
// what happened, just not repeated four times to say it.
function groupActivity(rows: NonNullable<PlatformOverviewMetrics["activity"]>) {
  const groups: {
    key: string;
    actor: string;
    action: string;
    table: string;
    count: number;
    latest: string;
  }[] = [];
  for (const row of rows) {
    const actor = row.actor_name || "System";
    const key = `${actor}|${row.action_type}|${row.target_table}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.count += 1;
    } else {
      groups.push({
        key,
        actor,
        action: row.action_type,
        table: row.target_table,
        count: 1,
        latest: row.created_at,
      });
    }
  }
  return groups;
}

function RecentActivityColumn({
  metrics,
  loading,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
}) {
  const groups = groupActivity(metrics?.activity ?? []).slice(0, 4);
  return (
    <div className="flex flex-col gap-2.5 min-w-0">
      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <span aria-hidden="true">🕒</span> Recent Activity
      </h3>
      {loading && (
        <div className="text-xs text-slate-400">Loading activity...</div>
      )}
      {!loading && groups.length === 0 && (
        <div className="text-xs text-slate-400">No recent activity logged.</div>
      )}
      {!loading &&
        groups.map((group) => (
          <div
            key={group.key + group.latest}
            className="flex items-center gap-2 text-xs"
          >
            <span className="size-5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-[9px] font-bold shrink-0">
              {group.actor.slice(0, 2).toUpperCase()}
            </span>
            <span className="flex-1 min-w-0 truncate text-slate-500 dark:text-slate-400">
              {group.actor} {group.action.replaceAll("_", " ")} {group.table}
              {group.count > 1 && ` ×${group.count}`}
            </span>
            <span className="text-slate-400 dark:text-slate-500 text-[10px] shrink-0">
              {timeAgo(group.latest)}
            </span>
          </div>
        ))}
    </div>
  );
}

// ── Column 2: AI Hub ────────────────────────────────────────────────────
function AiHubColumn({
  metrics,
  loading,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
}) {
  const flags = metrics?.queues.pending_moderation_flags ?? 0;
  return (
    <div className="flex flex-col gap-2.5 min-w-0">
      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <span aria-hidden="true">🤖</span> AI Hub
      </h3>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold text-slate-800 dark:text-slate-200 tabular-nums">
          {loading ? "..." : flags}
        </span>
        <span className="text-[11px] text-slate-400">pending flags</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">Calls (24h)</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
          {loading ? "..." : (metrics?.ai.calls_last_24h ?? 0).toLocaleString()}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">Est. cost</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
          {loading
            ? "..."
            : formatCurrency(metrics?.ai.estimated_cost ?? 0, { decimals: 2 })}
        </span>
      </div>
      <a
        href="/ai"
        className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline mt-1"
      >
        Open AI Hub →
      </a>
    </div>
  );
}

// ── Column 3: Regional Coverage ─────────────────────────────────────────
function RegionalCoverageColumn({
  metrics,
  loading,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
}) {
  const rows = Object.entries(metrics?.facilities.by_region ?? {})
    .map(([region, facilities]) => ({
      region: region.replaceAll("_", " "),
      facilities,
    }))
    .sort((a, b) => b.facilities - a.facilities)
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-2.5 min-w-0">
      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <span aria-hidden="true">🗺️</span> Regional Coverage
      </h3>
      {loading && <div className="text-xs text-slate-400">Loading...</div>}
      {!loading && rows.length === 0 && (
        <div className="text-xs text-slate-400">
          No facility regions found yet.
        </div>
      )}
      {!loading &&
        rows.map((row) => (
          <div
            key={row.region}
            className="flex items-center justify-between text-xs gap-2"
          >
            <span className="text-slate-500 dark:text-slate-400 truncate capitalize">
              {row.region}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums shrink-0">
              {row.facilities.toLocaleString()} facilities
            </span>
          </div>
        ))}
    </div>
  );
}

// ── Column 4: Tasks & Compliance ────────────────────────────────────────
interface ComplianceSettings {
  gra_tax_id: string | null;
  vat_rate: number | null;
  vat_filing_frequency: string | null;
  next_filing_due_date: string | null;
  last_filed_at: string | null;
}

const QUEUE_LABELS: {
  key: keyof NonNullable<PlatformOverviewMetrics["queues"]>;
  label: string;
  href: string;
}[] = [
  {
    key: "pending_facilities",
    label: "facilities pending approval",
    href: "/facilities?status=pending",
  },
  {
    key: "pending_hcp_verifications",
    label: "HCP verifications pending",
    href: "/hcp?tab=pending",
  },
  {
    key: "pending_facility_scout_submissions",
    label: "FacilityScout submissions pending",
    href: "/facility-scout?tab=pending",
  },
  {
    key: "pending_delete_requests",
    label: "delete-account requests pending",
    href: "/delete-account-request",
  },
  { key: "admins_missing_mfa", label: "admins without MFA", href: "/admins" },
  { key: "pending_job_posts", label: "job posts pending", href: "/jobs" },
  {
    key: "pending_ai_flags",
    label: "AI-detected flags to review",
    href: "/users?tab=flagged",
  },
  { key: "flagged_reviews", label: "flagged reviews", href: "/reviews" },
];

function complianceBadge(settings: ComplianceSettings | null): {
  text: string;
  variant: "secondary" | "destructive" | "amber" | "emerald";
} {
  if (!settings?.next_filing_due_date) {
    return { text: "SET UP", variant: "secondary" };
  }
  const daysUntil = Math.ceil(
    (new Date(settings.next_filing_due_date).getTime() - Date.now()) /
      (24 * 60 * 60 * 1000),
  );
  if (daysUntil < 0) return { text: "DUE", variant: "destructive" };
  if (daysUntil <= 14) return { text: "SOON", variant: "amber" };
  return { text: "OK", variant: "emerald" };
}

function TasksComplianceColumn({
  metrics,
  loading,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
}) {
  const canConfigure = useHasPermission("settings.billing");
  const [settings, setSettings] = useState<ComplianceSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/compliance/settings", {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setSettings(json.settings);
      }
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const topQueues = QUEUE_LABELS.map((q) => ({
    ...q,
    count: metrics?.queues[q.key] ?? 0,
  }))
    .filter((q) => q.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  const totalOpen = QUEUE_LABELS.reduce(
    (sum, q) => sum + (metrics?.queues[q.key] ?? 0),
    0,
  );
  const badge = complianceBadge(settings);

  return (
    <div className="flex flex-col gap-2.5 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <span aria-hidden="true">📋</span> Tasks &amp; Compliance
        </h3>
        {canConfigure && (
          <button
            onClick={() => setDialogOpen(true)}
            className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
          >
            Configure
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <Badge variant={badge.variant}>{badge.text}</Badge>
        <span className="flex-1 min-w-0 truncate text-slate-500 dark:text-slate-400">
          {settingsLoading
            ? "Loading compliance status..."
            : settings?.next_filing_due_date
              ? `${settings.vat_filing_frequency ?? "VAT"} filing — ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(settings.next_filing_due_date))}`
              : "GRA/VAT filing not configured"}
        </span>
      </div>

      {!loading &&
        topQueues.map((q) => (
          <a
            key={q.key}
            href={q.href}
            className="flex items-center gap-2 text-xs hover:underline"
          >
            <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums shrink-0">
              {q.count}
            </span>
            <span className="flex-1 min-w-0 truncate text-slate-500 dark:text-slate-400">
              {q.label}
            </span>
          </a>
        ))}

      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
        <span className="text-slate-500 dark:text-slate-400">
          Open pending tasks
        </span>
        <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
          {loading ? "..." : totalOpen}
        </span>
      </div>

      <ComplianceConfigDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        settings={settings}
        onSaved={loadSettings}
      />
    </div>
  );
}

function ComplianceConfigDialog({
  open,
  onClose,
  settings,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  settings: ComplianceSettings | null;
  onSaved: () => void;
}) {
  const [graTaxId, setGraTaxId] = useState("");
  const [vatRate, setVatRate] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [nextDue, setNextDue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setGraTaxId(settings?.gra_tax_id ?? "");
      setVatRate(settings?.vat_rate != null ? String(settings.vat_rate) : "");
      setFrequency(settings?.vat_filing_frequency ?? "monthly");
      setNextDue(settings?.next_filing_due_date ?? "");
    }
  }, [open, settings]);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/compliance/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          graTaxId: graTaxId || null,
          vatRate: vatRate ? Number(vatRate) : null,
          vatFilingFrequency: frequency,
          nextFilingDueDate: nextDue || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to save compliance settings.");
      }
      toast.success("Compliance settings updated");
      onClose();
      onSaved();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to save compliance settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compliance &amp; GRA Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="GRA Tax ID"
            value={graTaxId}
            onChange={(e) => setGraTaxId(e.target.value)}
          />
          <Input
            placeholder="VAT Rate (%)"
            type="number"
            step="0.01"
            value={vatRate}
            onChange={(e) => setVatRate(e.target.value)}
          />
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={nextDue}
            onChange={(e) => setNextDue(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────
export default function OperationsPanel({
  metrics,
  loading,
}: {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="text-sm font-semibold">Operations</div>
        <div className="text-xs text-muted-foreground">
          What&apos;s moving across the platform right now
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0">
          <div className="lg:pr-6">
            <RecentActivityColumn metrics={metrics} loading={loading} />
          </div>
          <div className="lg:border-l lg:border-slate-200 lg:dark:border-slate-600 lg:pl-6 lg:pr-6">
            <AiHubColumn metrics={metrics} loading={loading} />
          </div>
          <div className="lg:border-l lg:border-slate-200 lg:dark:border-slate-600 lg:pl-6 lg:pr-6">
            <RegionalCoverageColumn metrics={metrics} loading={loading} />
          </div>
          <div className="lg:border-l lg:border-slate-200 lg:dark:border-slate-600 lg:pl-6">
            <TasksComplianceColumn metrics={metrics} loading={loading} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
