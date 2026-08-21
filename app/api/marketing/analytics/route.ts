/**
 * GET /api/marketing/analytics — Analytics tab data (Gap Analysis Part M,
 * M6 + M-D4). CTR/ROI are server-computed from the budget/impressions/
 * clicks/conversions columns where populated; funnel stages with no event
 * tracking source yet return null so the UI renders "—".
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const auth = await requireAdminApiUser("marketing.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  const [overviewResult, campaignsResult] = await Promise.all([
    admin.rpc("get_marketing_overview"),
    admin
      .from("marketing_profile")
      .select("id, headline, status, campaign_type, channels, budget, impressions, clicks, conversions")
      .in("status", ["live", "paused", "ended"]),
  ]);

  if (overviewResult.error) {
    return NextResponse.json({ error: overviewResult.error.message }, { status: 500 });
  }
  if (campaignsResult.error) {
    return NextResponse.json({ error: campaignsResult.error.message }, { status: 500 });
  }

  const campaigns = campaignsResult.data ?? [];
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
    overview: overviewResult.data ?? {},
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
