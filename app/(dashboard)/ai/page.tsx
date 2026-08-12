"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  created_at: string;
};

type RecommendationsResponse = {
  recommendations: unknown[];
  total: number;
  source: string;
  message: string;
};

const tabs = [
  { id: "models", label: "Models", icon: Bot },
  { id: "moderation", label: "Moderation", icon: Shield },
  { id: "recommendations", label: "Recommendations", icon: Sparkles },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AIPage() {
  const [activeTab, setActiveTab] = useState("models");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [moderationItems, setModerationItems] = useState<ModerationItem[]>([]);
  const [recommendations, setRecommendations] =
    useState<RecommendationsResponse | null>(null);

  const modelRows = useMemo(
    () =>
      Object.entries(metrics?.byModel ?? {}).map(([model, value]) => ({
        model,
        ...value,
      })),
    [metrics],
  );

  const loadAIHub = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [metricsRes, analyticsRes, moderationRes, recommendationsRes] =
        await Promise.all([
          fetch("/api/ai/metrics?period=24h", { cache: "no-store" }),
          fetch("/api/ai/analytics?period=7d", { cache: "no-store" }),
          fetch("/api/ai/moderation-queue?limit=25", { cache: "no-store" }),
          fetch("/api/ai/recommendations", { cache: "no-store" }),
        ]);

      if (
        !metricsRes.ok ||
        !analyticsRes.ok ||
        !moderationRes.ok ||
        !recommendationsRes.ok
      ) {
        throw new Error("Unable to load one or more AI Hub datasets.");
      }

      const [metricsJson, analyticsJson, moderationJson, recommendationsJson] =
        await Promise.all([
          metricsRes.json(),
          analyticsRes.json(),
          moderationRes.json(),
          recommendationsRes.json(),
        ]);

      setMetrics(metricsJson);
      setAnalytics(analyticsJson);
      setModerationItems(moderationJson.items ?? []);
      setRecommendations(recommendationsJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load AI Hub.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAIHub();
  }, [loadAIHub]);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="AI Intelligence Hub"
        subtitle="Model usage, moderation queues, recommendations, and AI operations"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadAIHub}
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Bot className="h-5 w-5" />}
          label="AI Requests"
          value={loading ? "..." : metrics?.totalRequests ?? 0}
          variant="blue"
          delta="Last 24h"
          deltaType="neutral"
        />
        <KpiCard
          icon={<Zap className="h-5 w-5" />}
          label="Tokens"
          value={loading ? "..." : (metrics?.totalTokens ?? 0).toLocaleString()}
          variant="purple"
          delta={`${metrics?.avgLatency ?? 0}ms avg`}
          deltaType="neutral"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Success Rate"
          value={loading ? "..." : `${metrics?.successRate ?? 0}%`}
          variant={(metrics?.successRate ?? 0) >= 95 ? "green" : "amber"}
          delta="Fitness AI calls"
          deltaType={(metrics?.successRate ?? 0) >= 95 ? "up" : "neutral"}
        />
        <KpiCard
          icon={<Shield className="h-5 w-5" />}
          label="Pending Flags"
          value={loading ? "..." : analytics?.moderation.pending ?? 0}
          variant={(analytics?.moderation.pending ?? 0) > 0 ? "red" : "green"}
          delta={`${analytics?.moderation.aiDetected ?? 0} AI detected`}
          deltaType={(analytics?.moderation.pending ?? 0) > 0 ? "down" : "up"}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-slate-200">
          <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none bg-transparent p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="shrink-0 rounded-none border-b-2 border-transparent px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:border-emerald-700 data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 data-[state=active]:shadow-none"
              >
                <tab.icon className="mr-2 h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="models" className="mt-5 outline-none">
          <ModelsTable loading={loading} rows={modelRows} />
        </TabsContent>
        <TabsContent value="moderation" className="mt-5 outline-none">
          <ModerationTable loading={loading} items={moderationItems} />
        </TabsContent>
        <TabsContent value="recommendations" className="mt-5 outline-none">
          <RecommendationsPanel
            loading={loading}
            recommendations={recommendations}
          />
        </TabsContent>
        <TabsContent value="analytics" className="mt-5 outline-none">
          <AnalyticsPanel loading={loading} analytics={analytics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ModelsTable({
  loading,
  rows,
}: {
  loading: boolean;
  rows: Array<{ model: string; requests: number; tokens: number; avgLatency: number }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">
          Model Usage
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
            {loading && <EmptyRow colSpan={4} label="Loading model usage..." />}
            {!loading && rows.length === 0 && (
              <EmptyRow colSpan={4} label="No AI model calls recorded yet." />
            )}
            {!loading &&
              rows.map((row) => (
                <TableRow key={row.model}>
                  <TableCell className="font-bold text-slate-800">
                    {row.model}
                  </TableCell>
                  <TableCell>{row.requests}</TableCell>
                  <TableCell>{row.tokens.toLocaleString()}</TableCell>
                  <TableCell>{row.avgLatency}ms</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ModerationTable({
  loading,
  items,
}: {
  loading: boolean;
  items: ModerationItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">
          Moderation Queue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Content</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>AI Signal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Flagged</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <EmptyRow colSpan={5} label="Loading moderation queue..." />}
            {!loading && items.length === 0 && (
              <EmptyRow colSpan={5} label="No moderation flags found." />
            )}
            {!loading &&
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-bold text-slate-800">
                      {item.content_type}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-slate-400">
                      {item.content_id}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-sm whitespace-normal text-xs text-slate-500">
                    <span className="font-bold text-slate-700">
                      {item.report_reason}
                    </span>
                    {item.report_detail ? ` - ${item.report_detail}` : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.ai_detected ? "purple" : "secondary"}>
                      {item.ai_detected
                        ? `${Math.round(Number(item.ai_confidence ?? 0))}%`
                        : "Manual"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === "pending_review" ? "amber" : "emerald"
                      }
                    >
                      {item.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDate(item.created_at)}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RecommendationsPanel({
  loading,
  recommendations,
}: {
  loading: boolean;
  recommendations: RecommendationsResponse | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">
          AI Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <EmptyPanel label="Loading recommendations..." />
        ) : recommendations?.total ? (
          <EmptyPanel label={`${recommendations.total} recommendations loaded.`} />
        ) : (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <Sparkles className="h-4 w-4" />
            <AlertTitle>Recommendation pipeline not configured</AlertTitle>
            <AlertDescription>
              {recommendations?.message ||
                "No generated recommendation data is available yet."}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function AnalyticsPanel({
  loading,
  analytics,
}: {
  loading: boolean;
  analytics: Analytics | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">
            Usage Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <EmptyPanel label="Loading usage analytics..." />
          ) : (
            <>
              <MetricRow label="Requests" value={analytics?.usage.requests ?? 0} />
              <MetricRow label="Unique Users" value={analytics?.usage.uniqueUsers ?? 0} />
              <MetricRow label="Errors" value={analytics?.usage.errors ?? 0} />
              <MetricRow label="Avg Latency" value={`${analytics?.usage.avgLatency ?? 0}ms`} />
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">
            Moderation Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <EmptyPanel label="Loading moderation analytics..." />
          ) : (
            <>
              <MetricRow label="Flags" value={analytics?.moderation.flags ?? 0} />
              <MetricRow label="AI Detected" value={analytics?.moderation.aiDetected ?? 0} />
              <MetricRow label="Pending" value={analytics?.moderation.pending ?? 0} />
              <MetricRow label="Avg Confidence" value={`${analytics?.moderation.avgConfidence ?? 0}%`} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 p-3">
      <span className="text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <span className="text-sm font-bold text-slate-700">{value}</span>
    </div>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-400">
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
