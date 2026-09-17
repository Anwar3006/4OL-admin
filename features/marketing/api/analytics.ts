/**
 * GET /api/marketing/analytics — Analytics tab data (Gap Analysis Part M,
 * M6 + M-D4). CTR/ROI are server-computed from the budget/impressions/
 * clicks/conversions columns where populated; funnel stages with no event
 * tracking source yet return null so the UI renders "—".
 *
 * This used to also call get_marketing_overview() and return its result as
 * `overview`, so Marketing's own Subscriptions tab could read the
 * subscriber KPIs (premium_users/mrr/retention_pct/at_risk) out of it. That
 * tab moved to features/subscriptions (features/subscriptions/api/
 * overview.ts calls the RPC now); AnalyticsTab.tsx, the only remaining
 * consumer of this route, never read the `overview` field it produced — it
 * only reads `performance`/`channels`/`top_campaigns_by_ctr`/`funnel`, all
 * computed from `marketing_profile` below. The RPC call is removed rather
 * than kept for a value nothing here consumes.
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

export async function GET() {
  const auth = await requireAdminApiUser("marketing.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const campaignsResult = await admin
    .from("marketing_profile")
    .select("id, headline, status, campaign_type, channels, budget, impressions, clicks, conversions")
    .in("status", ["live", "paused", "ended"]);

  if (campaignsResult.error) {
    return NextResponse.json({ error: campaignsResult.error.message }, { status: 500 });
  }

  const campaigns = campaignsResult.data ?? [];

  // Merge mobile telemetry (analytics_events via get_campaign_event_stats)
  // into the manual column values. Degrades to columns-only when the
  // unification migration hasn't been applied yet.
  const campaignIds = campaigns.map((c) => c.id);
  if (campaignIds.length > 0) {
    const { data: eventStats, error: eventError } = await admin.rpc(
      "get_campaign_event_stats",
      { p_campaign_ids: campaignIds },
    );
    if (!eventError && eventStats) {
      for (const campaign of campaigns) {
        const stats = eventStats[campaign.id as keyof typeof eventStats];
        if (!stats) continue;
        campaign.impressions = (campaign.impressions ?? 0) + (stats.impressions ?? 0);
        campaign.clicks = (campaign.clicks ?? 0) + (stats.clicks ?? 0);
      }
    }
  }

  const impressions = campaigns.reduce((sum, c) => sum + (c.impressions ?? 0), 0);
  const clicks = campaigns.reduce((sum, c) => sum + (c.clicks ?? 0), 0);
  const conversions = campaigns.reduce((sum, c) => sum + (c.conversions ?? 0), 0);
  const adSpend = campaigns.reduce((sum, c) => sum + Number(c.budget ?? 0), 0);

  // Channel breakdown: aggregate impressions/clicks per channel membership.
  const channelMap = new Map<string, { campaigns: number; impressions: number; clicks: number }>();
  for (const campaign of campaigns) {
    for (const channel of (campaign.channels as string[]) ?? []) {
      const entry = channelMap.get(channel) ?? { campaigns: 0, impressions: 0, clicks: 0 };
      entry.campaigns += 1;
      entry.impressions += campaign.impressions ?? 0;
      entry.clicks += campaign.clicks ?? 0;
      channelMap.set(channel, entry);
    }
  }

  const topByCtr = campaigns
    .filter((c) => (c.impressions ?? 0) > 0)
    .map((c) => ({
      id: c.id,
      headline: c.headline,
      status: c.status,
      ctr: Number((((c.clicks ?? 0) / (c.impressions ?? 1)) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.ctr - a.ctr)
    .slice(0, 5);

  return NextResponse.json({
    performance: {
      impressions,
      clicks,
      conversions,
      avg_ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : null,
      ad_spend: Number(adSpend.toFixed(2)),
      // M-D4: no event tracking yet — ROAS/CPA/revenue stay null ("—" in UI)
      // until analytics_events exists.
      roas: null,
      cpa: null,
      revenue: null,
    },
    channels: Array.from(channelMap.entries()).map(([channel, entry]) => ({
      channel,
      ...entry,
    })),
    top_campaigns_by_ctr: topByCtr,
    funnel: {
      impressions: impressions || null,
      clicks: clicks || null,
      // Installs / sign-ups / upgrades need event tracking (Epic 30.1).
      installs: null,
      signups: null,
      upgrades: null,
    },
  });
}
