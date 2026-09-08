"use client";

/**
 * Design & Strategy tab — six static programme cards (Part L12, same
 * treatment as Jobs Business Strategy K10).
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CARDS = [
  {
    icon: "🎨",
    title: "Design Principles",
    points: [
      "Live truth: bed counts update from tablet dashboards, admin edits and API writes",
      "Every ward record shows Last Updated and Updated By for trust",
      "Critical state first — full wards surface as alerts, not buried reports",
    ],
  },
  {
    icon: "🏗️",
    title: "Technical Architecture",
    points: [
      "Per-ward rows (8 ward types) with trigger-maintained availability",
      "Full bed-update history table for audit trail",
      "Deterministic nearest-available routing (haversine) labelled 'AI' per product language",
    ],
  },
  {
    icon: "💰",
    title: "Business Model",
    points: [
      "SaaS tiers: Starter / Growth / Enterprise (GH₵ monthly)",
      "Hardware: lease, purchase or bring-your-own tablet",
      "NAS ambulance licence + B2G capacity analytics (future)",
    ],
  },
  {
    icon: "👥",
    title: "User Segments & Query Types",
    points: [
      "Ambulance units — nearest same-ward capacity lookups",
      "Emergency operators — dispatch coordination and reroutes",
      "App users and HCPs — availability awareness (read-only)",
    ],
  },
  {
    icon: "🤖",
    title: "Automation & 'AI' Features",
    points: [
      "Auto-alert when a tracked ward hits zero beds (per facility toggle)",
      "Route suggestions rank the 3 nearest facilities with ward capacity",
      "Reroutes recorded on dispatches for the analytics trail",
    ],
  },
  {
    icon: "📱",
    title: "Tablet Dashboard (Out of Scope)",
    points: [
      "15\" ward tablet PWA with offline sync is a separate project (L-D4)",
      "Admin tracks tablet_online and last_ping_at only",
      "USSD fallback queries belong to the tablet programme",
    ],
  },
];

export default function DesignStrategyTab() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {CARDS.map((card) => (
        <Card key={card.title}>
          <CardHeader>
            <CardTitle className="section-heading">
              {card.icon} {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {card.points.map((point) => (
                <li key={point} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
