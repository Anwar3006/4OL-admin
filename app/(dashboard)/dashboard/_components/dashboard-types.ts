export type TimeFilter = "7" | "30" | "90" | "year";

export type DeltaMetric = {
  current: number;
  previous: number;
  percent: number | null;
};

export type ActivityRow = {
  id: string;
  actor_name: string | null;
  action_type: string;
  target_table: string;
  record_id: string | null;
  created_at: string;
};

export type PlatformOverviewMetrics = {
  time_filter: TimeFilter | string;
  window: {
    start_at: string;
    end_at: string;
    previous_start_at: string;
  };
  kpis: {
    total_users: number;
    facilities: number;
    revenue_mtd: number | null;
    transactions: number;
    ai_queries_last_24h: number;
    premium_subscriptions: number;
    hcps: number;
    security_score: number | null;
  };
  deltas: {
    users: DeltaMetric;
    facilities: DeltaMetric;
    transactions: DeltaMetric;
    subscriptions: DeltaMetric;
    ai_calls: DeltaMetric;
  };
  users: {
    total: number;
    active_records: number;
    active: number;
    pending_verification: number;
    current_period: number;
    previous_period: number;
  };
  facilities: {
    total: number;
    active: number;
    pending: number;
    rejected: number;
    by_region: Record<string, number>;
  };
  content: {
    conditions: number;
    symptoms: number;
    categories: number;
    healthy_living: number;
    active_faqs: number;
  };
  fitness: {
    fitness_users: number;
    active_plans: number;
    live_challenges: number;
    exercise_library: number;
    ai_generated_workouts: number;
  };
  queues: {
    pending_facilities: number;
    pending_delete_requests: number;
    pending_hcp_verifications: number;
    pending_facility_scout_submissions: number;
    active_bed_alerts: number;
    open_security_threats: number;
    pending_moderation_flags: number;
    // Extended queues merged in by /api/dashboard/overview (Part D).
    admins_missing_mfa?: number;
    pending_job_posts?: number;
    pending_ai_flags?: number;
    flagged_reviews?: number;
  };
  operations: {
    notification_campaigns: number;
    notifications: number;
    hcp_verifications: number;
    verified_hcps: number;
    job_postings: number;
    job_applications: number;
    bedtracker_facilities: number;
    available_beds: number;
    facility_scout_submissions: number;
  };
  finance: {
    transactions: number;
    revenue: number | null;
    revenue_status: "live" | "awaiting_transaction_pipeline" | string;
  };
  subscriptions: {
    subscriptions: number;
    active_subscriptions: number;
    current_period: number;
    previous_period: number;
  };
  ai: {
    calls: number;
    calls_last_24h: number;
    estimated_cost: number;
    current_period: number;
    previous_period: number;
  };
  activity: ActivityRow[];
  unsupported: Record<string, null>;
};

export function formatCount(value: number | null | undefined) {
  if (value === null || value === undefined) return "Awaiting data";
  return value.toLocaleString();
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Awaiting data";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDelta(delta?: DeltaMetric, fallback = "No prior period") {
  if (!delta || delta.percent === null) return fallback;
  const sign = delta.percent > 0 ? "+" : "";
  return `${sign}${delta.percent}%`;
}

export function deltaType(delta?: DeltaMetric) {
  if (!delta?.percent) return "neutral" as const;
  return delta.percent > 0 ? ("up" as const) : ("down" as const);
}
