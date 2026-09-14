import { getBrowserClient } from "@/lib/db/browser";
import { useQuery } from "@tanstack/react-query";

/**
 * Fitness analytics hooks (Gap Analysis Part V).
 * All data comes from the SECURITY DEFINER aggregates in
 * supabase/migrations/20260821_fitness_extension.sql — no per-row client
 * joins (V-D5: the fitness_users table has 8K+ rows).
 */

// ─── Fitness Users (13-column rebuild) ─────────────────────────────────────

export interface FitnessUserRow {
  user_id: string;
  name: string;
  avatar_url: string | null;
  status: string | null;
  plan: string;
  level: string | null;
  /** Onboarding body type (fitness_onboarding_selections.body_type). */
  body_type: string | null;
  /** Onboarding fitness goals (fitness_onboarding_selections.fitness_goals). */
  fitness_goals: string[];
  workouts: number;
  kcal: number;
  fitcoins: number;
  ai_calls: number;
  joined_at: string;
  last_active: string | null;
  /**
   * This user's own progress on their currently assigned plan (0-100):
   * their completed sessions against that plan, divided by the plan's
   * total session count (duration_weeks * workouts_per_week). Not the
   * plan's global completion count across every user.
   */
  plan_completion_pct: number;
  /**
   * SUBSCRIPTION tier — not to be confused with `level`, which is the
   * training level (beginner/intermediate/advanced) from fitness onboarding.
   * 'free' when the user has no active grant or paid subscription.
   */
  tier_key: string;
  tier_name: string;
  is_premium: boolean;
  subscription_expires_at: string | null;
  subscription_source: string | null;
}

export const useFitnessUsers = ({
  page,
  limit,
  search,
}: {
  page: number;
  limit: number;
  search?: string;
}) => {
  return useQuery({
    queryKey: ["fitness-users", { page, limit, search }],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase.rpc("get_fitness_users", {
        p_limit: limit,
        p_offset: (page - 1) * limit,
        p_search: search?.trim() || null,
      });

      if (error) throw error;

      const payload = (data ?? {}) as {
        rows?: FitnessUserRow[];
        total?: number;
      };
      const total = payload.total ?? 0;

      return {
        rows: payload.rows ?? [],
        meta: { total, totalPages: Math.ceil(total / limit), currentPage: page },
      };
    },
    staleTime: 1000 * 60 * 2,
  });
};

// ─── AI Log stats ───────────────────────────────────────────────────────────

export interface FitnessAiCallRow {
  id: string;
  user_id: string | null;
  user_name: string | null;
  model_name: string;
  prompt_snippet: string | null;
  status: "success" | "error" | "timeout";
  response_time_ms: number | null;
  token_usage: number | null;
  estimated_cost: number | null;
  error_message: string | null;
  created_at: string;
}

export interface FitnessAiLogStats {
  totals: {
    calls: number;
    success: number;
    errors: number;
    tokens: number;
    estimated_cost: number;
    avg_latency_ms: number;
  };
  by_model: {
    model_name: string;
    calls: number;
    success: number;
    tokens: number;
    estimated_cost: number;
  }[];
  recent: FitnessAiCallRow[];
}

export const useFitnessAiLogStats = (periodDays = 30) => {
  return useQuery({
    queryKey: ["fitness-ai-log-stats", periodDays],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase.rpc("get_fitness_ai_log_stats", {
        p_period_days: periodDays,
      });

      if (error) throw error;

      const payload = (data ?? {}) as Partial<FitnessAiLogStats>;
      return {
        totals: {
          calls: 0,
          success: 0,
          errors: 0,
          tokens: 0,
          estimated_cost: 0,
          avg_latency_ms: 0,
          ...payload.totals,
        },
        by_model: payload.by_model ?? [],
        recent: payload.recent ?? [],
      } as FitnessAiLogStats;
    },
    staleTime: 1000 * 60 * 2,
  });
};

// ─── Health integrations sync stats ─────────────────────────────────────────

export interface FitnessHealthPlatformRow {
  id: string;
  platform_name: string;
  is_enabled: boolean;
  sync_frequency_mins: number;
  sync_success: number;
  sync_failures: number;
  last_sync_at: string | null;
}

export interface FitnessHealthSyncFailure {
  synced_at: string;
  status: string;
  error_details: string | null;
  retry_count: number;
  platform_name: string | null;
  user_name: string | null;
}

export interface FitnessHealthSyncStats {
  platforms: FitnessHealthPlatformRow[];
  recent_failures: FitnessHealthSyncFailure[];
}

export const useFitnessHealthSyncStats = () => {
  return useQuery({
    queryKey: ["fitness-health-sync-stats"],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase.rpc("get_fitness_health_sync_stats");

      if (error) throw error;

      const payload = (data ?? {}) as Partial<FitnessHealthSyncStats>;
      return {
        platforms: payload.platforms ?? [],
        recent_failures: payload.recent_failures ?? [],
      } as FitnessHealthSyncStats;
    },
    staleTime: 1000 * 60 * 2,
  });
};

// ─── Schedule heatmap (V-D3: real completed sessions, not mock data) ────────

export interface FitnessScheduleHeatCell {
  weekday: number; // ISO day of week, 1 = Monday
  week: string; // e.g. "2026-W33"
  sessions: number;
}

export interface FitnessScheduleStats {
  heatmap: FitnessScheduleHeatCell[];
  this_week: { completed: number; in_progress: number; abandoned: number };
}

export const useFitnessScheduleStats = () => {
  return useQuery({
    queryKey: ["fitness-schedule-stats"],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase.rpc("get_fitness_schedule_stats");

      if (error) throw error;

      const payload = (data ?? {}) as Partial<FitnessScheduleStats>;
      return {
        heatmap: payload.heatmap ?? [],
        this_week: {
          completed: 0,
          in_progress: 0,
          abandoned: 0,
          ...payload.this_week,
        },
      } as FitnessScheduleStats;
    },
    staleTime: 1000 * 60 * 5,
  });
};
