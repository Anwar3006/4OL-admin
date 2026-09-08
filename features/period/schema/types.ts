import type { PeriodTabId } from "@/features/period/schema/period-tracker";

/**
 * Shared vocabulary for the Period Tracker screens.
 *
 * `Row` is deliberately loose. The period payload is assembled from a dozen
 * tables by /api/period/data and has never had a generated type; tightening it
 * is E5.2, not this split.
 */
export type Row = Record<string, any>;
export type Tab = {
  id: PeriodTabId;
  label: string;
  description: string;
  /** Emoji glyph, rendered as text — not a component. */
  icon: string;
};

export const tabs: Tab[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Adoption, retention and data health",
    icon: "📊",
  },
  {
    id: "users",
    label: "Users & Cycles",
    description: "One privacy-minimized row per tracker",
    icon: "👥",
  },
  {
    id: "logs",
    label: "Daily Logs",
    description: "Structured observations and sync state",
    icon: "📝",
  },
  {
    id: "corrections",
    label: "Corrections",
    description: "Review calendar changes with an audit trail",
    icon: "🔧",
  },
  {
    id: "safety",
    label: "Safety Review",
    description: "Non-diagnostic signals and review SLAs",
    icon: "🚩",
  },
  {
    id: "notes",
    label: "Calendar Notes",
    description: "Flag metadata without exposing note text",
    icon: "📅",
  },
  {
    id: "consent",
    label: "Consent & Privacy",
    description: "Consent history and privacy requests",
    icon: "🛡️",
  },
  {
    id: "content",
    label: "Content",
    description: "Clinically governed education",
    icon: "📚",
  },
  {
    id: "engagement",
    label: "Engagement",
    description: "Consent-filtered campaigns and notifications",
    icon: "📣",
  },
  {
    id: "trivia",
    label: "Trivia",
    description: "Reviewed questions and learning outcomes",
    icon: "✨",
  },
  {
    id: "forecasts",
    label: "Forecasts",
    description: "Accuracy, confidence, drift and rollout",
    icon: "🧠",
  },
  {
    id: "quality",
    label: "App Quality",
    description: "Sync, client health and feature flags",
    icon: "✅",
  },
  {
    id: "ttc",
    label: "TTC & Fertility",
    description: "Aggregates and masked metadata only — never intimate detail",
    icon: "🤰",
  },
  {
    id: "premium",
    label: "Premium",
    description: "Cycle Pro grants, onboarding trials and expiry policy",
    icon: "💎",
  },
];
