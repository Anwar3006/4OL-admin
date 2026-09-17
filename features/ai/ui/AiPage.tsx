"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  RefreshCw,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import KpiGrid from "@/components/redesign/KpiGrid";
import { formatKpiPercent, formatKpiValue } from "@/lib/format";
import {
  TAB_IDS,
  type Analytics,
  type Metrics,
  type ModerationItem,
  type TabId,
} from "@/features/ai/schema/types";
import { ModelsTab } from "@/features/ai/ui/ModelsTab";
import { ModerationTable } from "@/features/ai/ui/ModerationTab";
import { RecommendationsPanel } from "@/features/ai/ui/RecommendationsTab";
import { AnalyticsPanel } from "@/features/ai/ui/AnalyticsTab";
import { useAiModels } from "@/features/ai/data/useAiModels";
import {
  useAiHubOverview,
  useAiRecommendationStats,
} from "@/features/ai/data/useAiRecommendationStats";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "models", label: "Models", icon: Bot },
  { id: "moderation", label: "Moderation", icon: Shield },
  { id: "recommendations", label: "Recommendations", icon: Sparkles },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

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

      {/*
        get_ai_hub_overview and get_ai_analytics (both RPCs behind these
        cards) return current-period aggregates only — no accuracy or
        query-volume history is retained anywhere in the AI schema, so
        there is no genuine series to chart. Pending Flags is the
        actionable queue (content needing human review), so it keeps the
        default size; the rest are descriptive snapshots and go "sm".
      */}
      <KpiGrid>
        <KpiCard
          icon={<Shield className="h-5 w-5" />}
          label="Pending Flags"
          value={formatKpiValue(
            overview.data?.pendingFlags ?? analytics?.moderation.pending ?? null,
          )}
          variant={(overview.data?.pendingFlags ?? 0) > 0 ? "red" : "green"}
          delta={`${formatKpiValue(analytics?.moderation.aiDetected ?? null)} AI detected`}
          // A current queue depth isn't a before/after read — variant
          // already carries the red/green urgency signal.
          deltaType="neutral"
          isLoading={overview.isPending && loading}
        />
        <KpiCard
          icon={<Bot className="h-5 w-5" />}
          label="Active Models"
          value={formatKpiValue(overview.data?.activeModels ?? null)}
          variant="blue"
          delta={`${formatKpiValue(models.data?.length ?? null)} registered`}
          deltaType="neutral"
          isLoading={overview.isPending}
          size="sm"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Avg Accuracy"
          value={formatKpiPercent(overview.data?.avgAccuracy ?? null, 1)}
          variant="green"
          delta="Registry baseline"
          deltaType="neutral"
          isLoading={overview.isPending}
          size="sm"
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
          size="sm"
        />
      </KpiGrid>

      <Tabs value={activeTab} onValueChange={changeTab} className="w-full">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none bg-transparent p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="shrink-0 rounded-none border-b-2 border-transparent px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 data-[state=active]:border-emerald-700 dark:data-[state=active]:border-emerald-400 data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-none"
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
