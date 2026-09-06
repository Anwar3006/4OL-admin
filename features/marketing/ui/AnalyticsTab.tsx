"use client";

import React from "react";
import KpiCard from "@/components/redesign/KpiCard";
import { apiFetch } from "@/lib/api-fetch";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/format";

type AnalyticsPayload = {
  performance: {
    impressions: number;
    clicks: number;
    conversions: number;
    avg_ctr: number | null;
    ad_spend: number;
    roas: number | null;
    cpa: number | null;
    revenue: number | null;
  };
  channels: { channel: string; campaigns: number; impressions: number; clicks: number }[];
  top_campaigns_by_ctr: { id: string; headline: string; status: string; ctr: number }[];
  funnel: {
    impressions: number | null;
    clicks: number | null;
    installs: number | null;
    signups: number | null;
    upgrades: number | null;
  };
};

const CHANNEL_LABELS: Record<string, string> = {
  push: "Push",
  sms: "SMS",
  email: "Email",
  in_app_banner: "In-App Banner",
  social: "Social",
};

const dash = (value: number | null | undefined, suffix = "") =>
  value == null ? "—" : `${value.toLocaleString()}${suffix}`;

/**
 * Gap Analysis Part M (M6/M-D4): Campaign Performance / ROI / Channel
 * Breakdown / Top CTR / Acquisition Funnel. Metrics with no data source
 * yet (ROAS/CPA/revenue, funnel installs→upgrades) render "—" until
 * analytics_events exists (Epic 30.1).
 */
export default function AnalyticsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["marketing-analytics"],
    queryFn: () => apiFetch<AnalyticsPayload>("/api/marketing/analytics"),
  });

  if (isLoading || !data) {
    return (
      <div className="w-full min-w-0 card mt-4 py-20 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
        Loading analytics…
      </div>
    );
  }

  const { performance, channels, top_campaigns_by_ctr, funnel } = data;
  const maxChannelImpressions = Math.max(1, ...channels.map((c) => c.impressions));
  const funnelStages = [
    { label: "Impressions", value: funnel.impressions },
    { label: "Clicks", value: funnel.clicks },
    { label: "Installs", value: funnel.installs },
    { label: "Sign-ups", value: funnel.signups },
    { label: "Upgrades", value: funnel.upgrades },
  ];

  return (
    <div className="w-full min-w-0 space-y-6 mt-4">
      {/* Campaign Performance 30d */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon="👁️" label="Impressions" value={dash(performance.impressions)} variant="blue" delta="All campaigns" deltaType="neutral" />
        <KpiCard icon="🖱️" label="Clicks" value={dash(performance.clicks)} variant="green" delta="All campaigns" deltaType="neutral" />
        <KpiCard icon="🎯" label="Avg CTR" value={dash(performance.avg_ctr, "%")} variant="teal" delta="Clicks ÷ impressions" deltaType="neutral" />
        <KpiCard icon="🔄" label="Conversions" value={dash(performance.conversions)} variant="amber" delta="Recorded to date" deltaType="neutral" />
        <KpiCard icon="💰" label="Ad Spend" value={formatCurrency(performance.ad_spend)} variant="indigo" delta="Budgets entered" deltaType="neutral" />
      </div>

      {/* ROI Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700 mb-4">ROI Summary</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Revenue", value: dash(performance.revenue) },
            { label: "ROAS", value: dash(performance.roas, "x") },
            { label: "CPA", value: dash(performance.cpa) },
            { label: "Premium Upgrades", value: dash(funnel.upgrades) },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
              <div className="text-xl font-black text-slate-800">{item.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{item.label}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 font-medium mt-3">
          Revenue/ROAS/CPA require event tracking (analytics_events — Epic 30.1) and show "—" until available.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700 mb-4">Channel Breakdown</h3>
          {channels.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium">No channel data yet — assign channels when creating campaigns.</p>
          ) : (
            <div className="space-y-3">
              {channels.map((channel) => (
                <div key={channel.channel}>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                    <span>{CHANNEL_LABELS[channel.channel] ?? channel.channel}</span>
                    <span>{channel.impressions.toLocaleString()} imp · {channel.clicks.toLocaleString()} clicks</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.round((channel.impressions / maxChannelImpressions) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Campaigns by CTR */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700 mb-4">Top Campaigns by CTR</h3>
          {top_campaigns_by_ctr.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium">No impression data recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {top_campaigns_by_ctr.map((campaign, index) => (
                <div key={campaign.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="text-[11px] font-black text-slate-700 truncate">{index + 1}. {campaign.headline}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{campaign.status}</div>
                  </div>
                  <span className="text-[11px] font-black text-emerald-600 shrink-0 ml-3">{campaign.ctr}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Acquisition Funnel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700 mb-4">User Acquisition Funnel</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {funnelStages.map((stage) => (
            <div key={stage.label} className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
              <div className="text-lg font-black text-slate-800">{dash(stage.value)}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{stage.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
