"use client";

import React from "react";

// Tab 6 — static revenue-model cards per mockup `#anatomy-strategy-cards`.
// Content mirrors admin-panel.html Business Strategy tab; no data dependency.

const STRATEGY_CARDS = [
  {
    icon: "🏥",
    title: "Specialist Referral Fees",
    body: "Body-part → specialist routing surfaces the right HCP for each condition. Referral bookings via Facilities generate a commission per completed appointment.",
    tag: "Revenue",
  },
  {
    icon: "💊",
    title: "Pharmacy & Medication Upsell",
    body: "Condition pages link to relevant drug categories in the Drug Database. Medication Enquiry routes purchase intent to IBP-verified pharmacies with escrow checkout.",
    tag: "Revenue",
  },
  {
    icon: "📚",
    title: "Premium Health Content",
    body: "Deep-dive anatomy and condition content can be gated behind premium membership tiers, bundled with AI consultation credits and ad-free browsing.",
    tag: "Subscription",
  },
  {
    icon: "📊",
    title: "Anonymised Health Insights",
    body: "Aggregate map-interaction and symptom-search trends (fully anonymised, region-level) inform public-health partners and research collaborations.",
    tag: "B2B",
  },
  {
    icon: "🎯",
    title: "Targeted Health Campaigns",
    body: "Body-part context powers segmented notification campaigns (e.g. malaria-season alerts by region) for approved health partners via the campaign workflow.",
    tag: "Marketing",
  },
  {
    icon: "🤝",
    title: "HCP & Facility Subscriptions",
    body: "Facilities listed against body-part specialisms gain visibility in Nearby Facilities. Verified listing + promotion tools are monetised via IBP business plans.",
    tag: "Subscription",
  },
];

export default function BusinessStrategyTab() {
  return (
    <div className="space-y-4">
      <div className="alert al-ok">
        <div className="al-ic">💼</div>
        <div className="flex-1 text-xs">
          <strong>Business Strategy</strong> — how the Human Anatomy module supports platform
          monetisation. These are reference cards; live metrics are on the Connected Modules tab.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {STRATEGY_CARDS.map((card) => (
          <div key={card.title} className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="text-2xl">{card.icon}</div>
              <span className="badge badge-purple">{card.tag}</span>
            </div>
            <h4 className="mt-3 section-heading">
              {card.title}
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
