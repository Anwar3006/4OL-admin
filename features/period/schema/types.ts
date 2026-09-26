import type { LucideIcon } from "lucide-react";
import {
  Baby,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
  FileText,
  Flag,
  Gem,
  Megaphone,
  Shield,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import type { PeriodTabId } from "@/features/period/schema/period-tracker";

/**
 * Shared vocabulary for the Period Tracker screens.
 *
 * `PeriodRow` names the identity/status fields the tabs share and leaves the
 * rest open via an index signature: /api/period/data assembles each tab's rows
 * from a different set of tables, so a fully-closed union would be both large
 * and brittle. The named fields are the ones the columns/formatters and the
 * Users & Cycles detail modal rely on; every other key stays `any` exactly as
 * the old `Record<string, any>` alias did — this is additive, not narrowing.
 */
export interface PeriodRow {
  /** Primary key on tabs whose rows are single records (content, logs…). */
  id?: string;
  /** Masked display name (Users & Cycles, safety, notes). */
  user?: string;
  /** Stable user reference — always masked before render. */
  userId?: string;
  user_id?: string;
  region?: string;
  /** Lifecycle/review state, rendered by the shared `status` formatter. */
  status?: string;
  /** Safety/corrections SLA breach flag consumed by `status`. */
  overdue?: boolean;
  /** Trivia batch grouping key (present only on the Trivia tab). */
  batchId?: string;
  [key: string]: any;
}
/**
 * UI-layer row contract. Deliberately loose, exactly as before: each tab's
 * table, columns and formatters read whatever keys their slice of the payload
 * carries, and `/api/period/data` assembles those rows from a dozen different
 * tables. Narrowing this alias to `PeriodRow` would force `string | undefined`
 * guards through six presentational files for no runtime gain, so `Row` stays
 * `Record<string, any>`. `PeriodRow` is the typed shape at the data/query
 * boundary (`PeriodPayload.data`, `usePeriodData`); it is assignable to `Row`,
 * so the two meet cleanly where PeriodPage hands query rows to the tables.
 */
export type Row = Record<string, any>;

/** The /api/period/data response envelope. `data` is the active tab's rows;
 * the remaining keys are per-tab aggregates (events, stats, settings…). */
export interface PeriodPayload {
  data?: PeriodRow[];
  pagination?: {
    page?: number;
    totalPages?: number;
    total?: number;
    [key: string]: any;
  };
  summary?: Record<string, any>;
  sourceLinkCount?: number;
  [key: string]: any;
}

export type Tab = {
  id: PeriodTabId;
  label: string;
  description: string;
  /** lucide icon component — matches the rest of the admin's iconography. */
  icon: LucideIcon;
};

export const tabs: Tab[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Adoption, retention and data health",
    icon: BarChart3,
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
    icon: FileText,
  },
  {
    id: "corrections",
    label: "Corrections",
    description: "Review calendar changes with an audit trail",
    icon: Wrench,
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
    icon: CalendarDays,
  },
  {
    id: "consent",
    label: "Consent & Privacy",
    description: "Consent history and privacy requests",
    icon: Shield,
  },
  {
    id: "content",
    label: "Content",
    description: "Clinically governed education",
    icon: BookOpen,
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
    icon: Brain,
  },
  {
    id: "quality",
    label: "App Quality",
    description: "Sync, client health and feature flags",
    icon: CheckCircle2,
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
