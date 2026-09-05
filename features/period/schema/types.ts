import {
  Activity, Baby, BookOpenCheck, BrainCircuit, CalendarCheck, ClipboardList,
  Flag, Gem, HeartHandshake, Megaphone, Settings2, ShieldCheck, Sparkles, Users,
} from "lucide-react";
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
  icon: React.ComponentType<{ className?: string }>;
};

export const tabs: Tab[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Adoption, retention and data health",
    icon: Activity,
  },
  {
    id: "users",
    label: "Users & Cycles",
    description: "One privacy-minimized row per tracker",
    icon: Users,
  },
  {
    id: "logs",
    label: "Daily Logs",
    description: "Structured observations and sync state",
    icon: ClipboardList,
  },
  {
    id: "corrections",
    label: "Corrections",
    description: "Review calendar changes with an audit trail",
    icon: CalendarCheck,
  },
  {
    id: "safety",
    label: "Safety Review",
    description: "Non-diagnostic signals and review SLAs",
    icon: Flag,
  },
  {
    id: "notes",
    label: "Calendar Notes",
    description: "Flag metadata without exposing note text",
    icon: ClipboardList,
  },
  {
    id: "consent",
    label: "Consent & Privacy",
    description: "Consent history and privacy requests",
    icon: ShieldCheck,
  },
  {
    id: "content",
    label: "Content",
    description: "Clinically governed education",
    icon: BookOpenCheck,
  },
  {
    id: "engagement",
    label: "Engagement",
    description: "Consent-filtered campaigns and notifications",
    icon: Megaphone,
  },
  {
    id: "trivia",
    label: "Trivia",
    description: "Reviewed questions and learning outcomes",
    icon: Sparkles,
  },
  {
    id: "forecasts",
    label: "Forecasts",
    description: "Accuracy, confidence, drift and rollout",
    icon: BrainCircuit,
  },
  {
    id: "quality",
    label: "App Quality",
    description: "Sync, client health and feature flags",
    icon: Settings2,
  },
  {
    id: "ttc",
    label: "TTC & Fertility",
    description: "Aggregates and masked metadata only — never intimate detail",
    icon: Baby,
  },
  {
    id: "premium",
    label: "Premium",
    description: "Cycle Pro grants, onboarding trials and expiry policy",
    icon: Gem,
  },
];
