"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Ban,
  Bot,
  CheckCircle2,
  MessageSquareWarning,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import KpiGrid from "@/components/redesign/KpiGrid";
import { formatCurrency, formatKpiValue, formatKpiPercent } from "@/lib/format";
import {
  useAiModels,
  useDeployAiModel,
  useUpdateAiModel,
  type AiModel,
} from "@/features/ai/data/useAiModels";
import {
  useAiHubOverview,
  useAiRecommendationStats,
  type AiRecommendationsResponse,
} from "@/features/ai/data/useAiRecommendationStats";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Metrics = {
  period: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  successRate: number;
  byModel: Record<
    string,
    { requests: number; tokens: number; avgLatency: number }
  >;
};

type Analytics = {
  period: string;
  usage: {
    requests: number;
    uniqueUsers: number;
    errors: number;
    tokens: number;
    avgLatency: number;
  };
  moderation: {
    flags: number;
    aiDetected: number;
    pending: number;
    avgConfidence: number;
  };
};

type ModerationItem = {
  id: string;
  content_type: string;
  content_id: string;
  report_reason: string;
  report_detail: string | null;
  ai_detected: boolean | null;
  ai_confidence: number | null;
  ai_reason: string | null;
  status: string;
  action_taken: string | null;
  created_at: string;
};

const TAB_IDS = ["models", "moderation", "recommendations", "analytics"] as const;
type TabId = (typeof TAB_IDS)[number];

const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "models", label: "Models", icon: Bot },
  { id: "moderation", label: "Moderation", icon: Shield },
  { id: "recommendations", label: "Recommendations", icon: Sparkles },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

const TYPE_LABEL: Record<string, string> = {
  classification: "Classification",
  nlp: "NLP",
  medical_nlp: "Medical NLP",
  recommendation: "Recommendation",
  anomaly_detection: "Anomaly Detect",
  generative_ai: "Generative AI",
  translation: "Translation",
  regression: "Regression",
};

// O5: moderation_status enum → human display labels.
const STATUS_LABEL: Record<string, string> = {
  pending_review: "Pending",
  approved: "Approved",
  rejected: "Dismissed",
  flagged: "Flagged",
  escalated: "Escalated",
  auto_moderated: "Auto-moderated",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

// O-D3: risk derived from ai_confidence (>=90 high, >=70 medium, else low).
function deriveRisk(item: ModerationItem): "high" | "medium" | "low" {
  const confidence = Number(item.ai_confidence ?? 0);
  if (confidence >= 90) return "high";
  if (confidence >= 70) return "medium";
  return "low";
}

export default function AIPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("models");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [moderationItems, setModerationItems] = useState<ModerationItem[]>([]);

  const overview = useAiHubOverview();
  const models = useAiModels();
  const recommendations = useAiRecommendationStats();

  // ?tab= deep links from the sidebar children (O-D6).
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("tab");
    if (param && TAB_IDS.includes(param as TabId)) {
      setActiveTab(param as TabId);
    }
  }, []);

  const changeTab = useCallback(
    (tab: string) => {
      setActiveTab(tab as TabId);
      router.replace(`/ai?tab=${tab}`, { scroll: false });
    },
    [router],
  );

  const loadUsage = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [metricsRes, analyticsRes, moderationRes] = await Promise.all([
        fetch("/api/ai/metrics?period=24h", { cache: "no-store" }),
        fetch("/api/ai/analytics?period=7d", { cache: "no-store" }),
        fetch("/api/ai/moderation-queue?limit=25", { cache: "no-store" }),
      ]);

      if (!metricsRes.ok || !analyticsRes.ok || !moderationRes.ok) {
        throw new Error("Unable to load one or more AI Hub datasets.");
      }

      const [metricsJson, analyticsJson, moderationJson] = await Promise.all([
        metricsRes.json(),
        analyticsRes.json(),
        moderationRes.json(),
      ]);

      setMetrics(metricsJson);
      setAnalytics(analyticsJson);
      setModerationItems(moderationJson.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load AI Hub.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  const refreshAll = useCallback(() => {
    loadUsage();
    void overview.refetch();
    void models.refetch();
    void recommendations.refetch();
  }, [loadUsage, overview, models, recommendations]);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="AI Intelligence Hub"
        subtitle="Model registry, moderation queue, recommendations, and AI operations"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={refreshAll}
          disabled={loading}
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </PageHeader>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>AI Hub unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <KpiGrid>
        <KpiCard
          icon={<Bot className="h-5 w-5" />}
          label="Active Models"
          value={formatKpiValue(overview.data?.activeModels ?? null)}
          variant="blue"
          delta={`${formatKpiValue(models.data?.length ?? null)} registered`}
          deltaType="neutral"
          isLoading={overview.isPending}
        />
        <KpiCard
          icon={<Shield className="h-5 w-5" />}
          label="Pending Flags"
          value={formatKpiValue(
            overview.data?.pendingFlags ?? analytics?.moderation.pending ?? null,
          )}
          variant={(overview.data?.pendingFlags ?? 0) > 0 ? "red" : "green"}
          delta={`${formatKpiValue(analytics?.moderation.aiDetected ?? null)} AI detected`}
          deltaType={(overview.data?.pendingFlags ?? 0) > 0 ? "down" : "up"}
          isLoading={overview.isPending && loading}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Avg Accuracy"
          value={formatKpiPercent(overview.data?.avgAccuracy ?? null, 1)}
          variant="green"
          delta="Registry baseline"
          deltaType="neutral"
          isLoading={overview.isPending}
        />
        <KpiCard
          icon={<Zap className="h-5 w-5" />}
          label="Queries Today"
          value={formatKpiValue(overview.data?.queriesToday ?? null, {
            compact: true,
          })}
          variant="purple"
          delta={`${formatKpiValue(metrics?.avgLatency ?? null)}ms avg latency`}
          deltaType="neutral"
          isLoading={overview.isPending}
        />
      </KpiGrid>

      <Tabs value={activeTab} onValueChange={changeTab} className="w-full">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none bg-transparent p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="shrink-0 rounded-none border-b-2 border-transparent px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 data-[state=active]:border-emerald-700 data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 data-[state=active]:shadow-none"
              >
                <tab.icon className="mr-2 h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="models" className="mt-5 outline-none">
          <ModelsTab
            models={models.data ?? []}
            loading={models.isPending}
            usageRows={Object.entries(metrics?.byModel ?? {}).map(([model, value]) => ({
              model,
              ...value,
            }))}
            usageLoading={loading}
            onRefresh={refreshAll}
          />
        </TabsContent>
        <TabsContent value="moderation" className="mt-5 outline-none">
          <ModerationTable
            loading={loading}
            items={moderationItems}
            onActionComplete={loadUsage}
          />
        </TabsContent>
        <TabsContent value="recommendations" className="mt-5 outline-none">
          <RecommendationsPanel data={recommendations.data ?? null} loading={recommendations.isPending} />
        </TabsContent>
        <TabsContent value="analytics" className="mt-5 outline-none">
          <AnalyticsPanel
            loading={loading}
            analytics={analytics}
            metrics={metrics}
            models={models.data ?? []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─────────────────────────── Models tab ─────────────────────────── */

const ACCURACY_CLS = {
  good: "text-emerald-600",
  warn: "text-amber-600",
  bad: "text-red-600",
} as const;

function accuracyClass(accuracy: number, target: number) {
  if (accuracy >= target) return ACCURACY_CLS.good;
  if (accuracy >= target - 5) return ACCURACY_CLS.warn;
  return ACCURACY_CLS.bad;
}

const MODEL_STATUS_BADGE: Record<AiModel["status"], { label: string; variant: "emerald" | "purple" | "secondary" | "amber" }> = {
  active: { label: "Active", variant: "emerald" },
  beta: { label: "Beta", variant: "purple" },
  staging: { label: "Staging", variant: "secondary" },
  paused: { label: "Paused", variant: "amber" },
};

function ModelsTab({
  models,
  loading,
  usageRows,
  usageLoading,
  onRefresh,
}: {
  models: AiModel[];
  loading: boolean;
  usageRows: Array<{ model: string; requests: number; tokens: number; avgLatency: number }>;
  usageLoading: boolean;
  onRefresh: () => void;
}) {
  const [deployOpen, setDeployOpen] = useState(false);
  const updateModel = useUpdateAiModel();

  const handleTogglePause = useCallback(
    (model: AiModel) => {
      updateModel.mutate({
        id: model.id,
        status: model.status === "paused" ? "active" : "paused",
      });
    },
    [updateModel],
  );

  const handleCopyDetails = useCallback((model: AiModel) => {
    const details = [
      `Model: ${model.name} (${model.model_key})`,
      `Type: ${TYPE_LABEL[model.model_type] ?? model.model_type}`,
      `Version: ${model.version}`,
      `Accuracy: ${model.accuracy_latest ?? "—"}% (target ${model.accuracy_target}%)`,
      `Status: ${model.status}`,
    ].join("\n");
    void navigator.clipboard.writeText(details).then(
      () => toast.success("Model details copied."),
      () => toast.error("Copy failed."),
    );
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Model Registry
          </CardTitle>
          <Button type="button" size="sm" onClick={() => setDeployOpen(true)}>
            <Plus className="h-4 w-4" /> Deploy Model
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>Last Trained</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <EmptyRow colSpan={7} label="Loading model registry..." />}
              {!loading && models.length === 0 && (
                <EmptyRow
                  colSpan={7}
                  label="No models registered yet — deploy your first model to get started."
                />
              )}
              {!loading &&
                models.map((model) => {
                  const badge = MODEL_STATUS_BADGE[model.status];
                  return (
                    <TableRow key={model.id}>
                      <TableCell className="max-w-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          {model.name}
                        </div>
                        {model.description && (
                          <div className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                            {model.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {TYPE_LABEL[model.model_type] ?? model.model_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{model.version}</TableCell>
                      <TableCell>
                        {model.accuracy_latest == null ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span
                            className={`font-semibold tabular-nums ${accuracyClass(
                              model.accuracy_latest,
                              model.accuracy_target,
                            )}`}
                          >
                            {model.accuracy_latest}%
                            <span className="ml-1 text-[11px] font-normal text-slate-400">
                              / {model.accuracy_target}%
                            </span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {model.last_trained_at ? formatDate(model.last_trained_at) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            aria-label={model.status === "paused" ? "Resume model" : "Pause model"}
                            title={model.status === "paused" ? "Resume model" : "Pause model"}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                            disabled={updateModel.isPending}
                            onClick={() => handleTogglePause(model)}
                          >
                            {model.status === "paused" ? (
                              <PlayCircle className="h-4 w-4" />
                            ) : (
                              <PauseCircle className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            aria-label="Copy details"
                            title="Copy details"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            onClick={() => handleCopyDetails(model)}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Model Usage (last 24h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Avg Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usageLoading && <EmptyRow colSpan={4} label="Loading model usage..." />}
              {!usageLoading && usageRows.length === 0 && (
                <EmptyRow colSpan={4} label="No AI model calls recorded yet." />
              )}
              {!usageLoading &&
                usageRows.map((row) => (
                  <TableRow key={row.model}>
                    <TableCell className="font-semibold text-slate-800 dark:text-slate-100">
                      {row.model}
                    </TableCell>
                    <TableCell className="tabular-nums">{formatKpiValue(row.requests)}</TableCell>
                    <TableCell className="tabular-nums">{formatKpiValue(row.tokens)}</TableCell>
                    <TableCell className="tabular-nums">{row.avgLatency}ms</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DeployModelDialog open={deployOpen} onOpenChange={setDeployOpen} onDeployed={onRefresh} />
    </div>
  );
}

const DEPLOY_TYPES = Object.entries(TYPE_LABEL);

function DeployModelDialog({
  open,
  onOpenChange,
  onDeployed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeployed: () => void;
}) {
  const deploy = useDeployAiModel();
  const [form, setForm] = useState({
    name: "",
    modelKey: "",
    description: "",
    modelType: "classification",
    version: "v1.0",
    accuracyTarget: "90",
    status: "staging",
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const target = Number(form.accuracyTarget);
    if (!form.name.trim() || form.name.trim().length < 2) {
      toast.error("Model name must be at least 2 characters.");
      return;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.modelKey.trim())) {
      toast.error("Model key must be lowercase kebab-case (e.g. symptom-classifier).");
      return;
    }
    if (!Number.isFinite(target) || target < 1 || target > 100) {
      toast.error("Accuracy target must be between 1 and 100.");
      return;
    }
    deploy.mutate(
      {
        name: form.name.trim(),
        modelKey: form.modelKey.trim(),
        description: form.description.trim() || undefined,
        modelType: form.modelType,
        version: form.version.trim() || "v1.0",
        accuracyTarget: target,
        status: form.status,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onDeployed();
          setForm({
            name: "",
            modelKey: "",
            description: "",
            modelType: "classification",
            version: "v1.0",
            accuracyTarget: "90",
            status: "staging",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Deploy Model</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deploy-name">Model name</Label>
            <Input
              id="deploy-name"
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder="Symptom Classifier"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deploy-key">Model key</Label>
            <Input
              id="deploy-key"
              value={form.modelKey}
              onChange={(e) => set("modelKey")(e.target.value)}
              placeholder="symptom-classifier"
              className="font-mono"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.modelType} onValueChange={set("modelType")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPLOY_TYPES.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Initial status</Label>
              <Select value={form.status} onValueChange={set("status")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="beta">Beta</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deploy-version">Version</Label>
              <Input
                id="deploy-version"
                value={form.version}
                onChange={(e) => set("version")(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deploy-target">Accuracy target (%)</Label>
              <Input
                id="deploy-target"
                type="number"
                min={1}
                max={100}
                value={form.accuracyTarget}
                onChange={(e) => set("accuracyTarget")(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deploy-description">Description</Label>
            <Textarea
              id="deploy-description"
              value={form.description}
              onChange={(e) => set("description")(e.target.value)}
              rows={2}
              placeholder="What this model does…"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={deploy.isPending}>
              {deploy.isPending ? "Deploying…" : "Deploy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Moderation tab ───────────────────────── */

type ModerationAction = "dismiss" | "warn" | "remove" | "ban";

const ACTION_LABEL: Record<string, string> = {
  dismiss: "Dismissed",
  warn: "Warned",
  remove: "Removed",
  ban: "Banned",
};

const RISK_BADGE: Record<string, { variant: "destructive" | "amber" | "secondary" }> = {
  high: { variant: "destructive" },
  medium: { variant: "amber" },
  low: { variant: "secondary" },
};

function ModerationTable({
  loading,
  items,
  onActionComplete,
}: {
  loading: boolean;
  items: ModerationItem[];
  onActionComplete: () => void;
}) {
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  const handleAction = useCallback(
    async (id: string, action: ModerationAction) => {
      setActingOnId(id);
      try {
        const res = await fetch("/api/ai/moderation-queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.error || "Failed to update moderation item.");
        }
        toast.success(
          action === "dismiss"
            ? "Flag dismissed."
            : action === "warn"
              ? "Content warned."
              : action === "remove"
                ? "Content removed."
                : "Author banned.",
        );
        onActionComplete();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Action failed.");
      } finally {
        setActingOnId(null);
      }
    },
    [onActionComplete],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Moderation Queue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Content</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Flagged</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <EmptyRow colSpan={7} label="Loading moderation queue..." />}
            {!loading && items.length === 0 && (
              <EmptyRow colSpan={7} label="No moderation flags found." />
            )}
            {!loading &&
              items.map((item) => {
                const isPending = item.status === "pending_review";
                const isActing = actingOnId === item.id;
                const risk = deriveRisk(item);
                const confidence = Math.round(Number(item.ai_confidence ?? 0));
                return (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[220px]">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">
                        {item.content_type.replaceAll("_", " ")}
                      </div>
                      <div className="mt-1 truncate font-mono text-[11px] text-slate-400">
                        {item.content_id}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-sm whitespace-normal text-xs text-slate-500">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {item.report_reason}
                      </span>
                      {item.ai_reason ? ` — ${item.ai_reason}` : ""}
                      {item.report_detail ? ` — ${item.report_detail}` : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant={RISK_BADGE[risk].variant} className="uppercase">
                        {risk}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[110px]">
                      {item.ai_detected ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                            <div
                              className={`h-full rounded-full ${
                                risk === "high"
                                  ? "bg-red-500"
                                  : risk === "medium"
                                    ? "bg-amber-500"
                                    : "bg-slate-400"
                              }`}
                              style={{ width: `${confidence}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-slate-500">{confidence}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Manual</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isPending ? "amber" : "emerald"}>
                        {STATUS_LABEL[item.status] ?? item.status.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDate(item.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPending ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            aria-label="Dismiss"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                            disabled={isActing}
                            onClick={() => handleAction(item.id, "dismiss")}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            aria-label="Warn"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                            disabled={isActing}
                            onClick={() => handleAction(item.id, "warn")}
                          >
                            <MessageSquareWarning className="h-4 w-4" />
                          </Button>
                          <Button
                            aria-label="Remove content"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            disabled={isActing}
                            onClick={() => handleAction(item.id, "remove")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            aria-label="Ban author"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-700"
                            disabled={isActing}
                            onClick={() => handleAction(item.id, "ban")}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {item.action_taken
                            ? ACTION_LABEL[item.action_taken] ?? item.action_taken
                            : STATUS_LABEL[item.status] ?? item.status}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ───────────────────── Recommendations tab ───────────────────── */

function RecommendationsPanel({
  data,
  loading,
}: {
  data: AiRecommendationsResponse | null;
  loading: boolean;
}) {
  if (loading) {
    return <EmptyPanel label="Loading recommendation stats..." />;
  }

  if (!data?.configured) {
    return (
      <Alert className="border-amber-200 bg-amber-50 text-amber-900">
        <Sparkles className="h-4 w-4" />
        <AlertTitle>Recommendation pipeline not configured</AlertTitle>
        <AlertDescription>
          No rows exist in <code className="font-mono">ai_recommendation_stats</code> yet. Stats
          appear once the recommender pipeline (or a manual import) starts writing daily rows.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard
          icon={<Sparkles className="h-5 w-5" />}
          label="Generated today"
          value={formatKpiValue(data.stats.generatedToday, { compact: true })}
          variant="purple"
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Click-through rate"
          value={`${data.stats.ctr}%`}
          variant="blue"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Conversions"
          value={formatKpiValue(data.stats.conversions)}
          variant="green"
        />
        <KpiCard
          icon={<Bot className="h-5 w-5" />}
          label="Satisfaction"
          value={data.stats.satisfaction != null ? `${data.stats.satisfaction}/5` : "—"}
          variant="teal"
        />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Top Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.categories.map((category) => (
              <div key={category.type}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium capitalize text-slate-600 dark:text-slate-300">
                    {category.type.replaceAll("_", " ")}
                  </span>
                  <span className="tabular-nums text-slate-400">
                    {formatKpiValue(category.served)} · {category.share}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${category.barPct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Segment Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Segment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Served</TableHead>
                  <TableHead>CTR</TableHead>
                  <TableHead>Conv.</TableHead>
                  <TableHead>Satisfaction</TableHead>
                  <TableHead>Version</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.segments.length === 0 && (
                  <EmptyRow colSpan={7} label="No segment rows recorded yet." />
                )}
                {data.segments.map((segment, index) => (
                  <TableRow key={`${segment.statDate}-${segment.userSegment}-${index}`}>
                    <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                      {segment.userSegment}
                    </TableCell>
                    <TableCell className="capitalize">
                      {segment.recommendationType.replaceAll("_", " ")}
                    </TableCell>
                    <TableCell className="tabular-nums">{formatKpiValue(segment.itemsServed)}</TableCell>
                    <TableCell className="tabular-nums">{segment.ctr}%</TableCell>
                    <TableCell className="tabular-nums">{formatKpiValue(segment.conversions)}</TableCell>
                    <TableCell>{segment.satisfaction != null ? `${segment.satisfaction}/5` : "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{segment.modelVersion}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ───────────────────────── Analytics tab ───────────────────────── */

function AnalyticsPanel({
  loading,
  analytics,
  metrics,
  models,
}: {
  loading: boolean;
  analytics: Analytics | null;
  metrics: Metrics | null;
  models: AiModel[];
}) {
  // O8: deterministic retrain alert — any model whose latest accuracy sits
  // below its registered target. No eval pipeline needed for this rule.
  const underTarget = useMemo(
    () =>
      models.filter(
        (model) =>
          model.accuracy_latest != null && model.accuracy_latest < model.accuracy_target,
      ),
    [models],
  );

  const costPerQuery =
    metrics && metrics.totalRequests > 0
      ? (metrics.totalCost / metrics.totalRequests).toFixed(3)
      : null;

  return (
    <div className="space-y-4">
      {underTarget.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Retrain recommended</AlertTitle>
          <AlertDescription>
            {underTarget.map((model) => (
              <div key={model.id}>
                <b>{model.name}</b> — {model.accuracy_latest}% accuracy vs {model.accuracy_target}%
                target.
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <KpiGrid variant="wide">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              AI Usage Trend (7d)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <EmptyPanel label="Loading usage analytics..." />
            ) : (
              <>
                <MetricRow label="Requests" value={formatKpiValue(analytics?.usage.requests ?? 0)} />
                <MetricRow label="Unique Users" value={formatKpiValue(analytics?.usage.uniqueUsers ?? 0)} />
                <MetricRow label="Errors" value={formatKpiValue(analytics?.usage.errors ?? 0)} />
                <MetricRow label="Avg Latency" value={`${analytics?.usage.avgLatency ?? 0}ms`} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Model Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {models.length === 0 && <EmptyPanel label="No registered models." />}
            {models
              .filter((model) => model.accuracy_latest != null)
              .map((model) => (
                <div key={model.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600 dark:text-slate-300">{model.name}</span>
                    <span
                      className={`tabular-nums ${accuracyClass(
                        model.accuracy_latest as number,
                        model.accuracy_target,
                      )}`}
                    >
                      {model.accuracy_latest}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className={`h-full rounded-full ${
                        (model.accuracy_latest as number) >= model.accuracy_target
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${model.accuracy_latest}%` }}
                    />
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Cost & Efficiency (24h)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <EmptyPanel label="Loading cost metrics..." />
            ) : (
              <>
                <MetricRow
                  label="API Cost"
                  value={formatKpiValue(metrics?.totalCost ?? 0, { currency: true })}
                />
                <MetricRow label="Cost / Query" value={formatCurrency(costPerQuery, { decimals: 2, fallback: "—" })} />
                <MetricRow label="Tokens" value={formatKpiValue(metrics?.totalTokens ?? 0, { compact: true })} />
                <MetricRow label="Success Rate" value={`${metrics?.successRate ?? 0}%`} />
              </>
            )}
          </CardContent>
        </Card>
      </KpiGrid>
    </div>
  );
}

/* ───────────────────────── Shared pieces ───────────────────────── */

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
        {value}
      </span>
    </div>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-400 dark:border-slate-700">
      {label}
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
