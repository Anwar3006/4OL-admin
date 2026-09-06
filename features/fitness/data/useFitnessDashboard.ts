import { getBrowserClient } from "@/lib/db/browser";
import { useQuery } from "@tanstack/react-query";

export interface FitnessDashboardMetrics {
  total_fitness_users: number;
  active_plans: number;
  live_challenges: number;
  exercise_library_count: number;
  fitcoins_issued: number;
  ai_generated_plans: number;
  active_workouts: number;
  avg_streak: number;
  avg_completion: number;
}

export interface FitnessTopChallenge {
  id: string;
  title: string;
  participants_count: number;
}

export interface FitnessMostUsedPlan {
  plan_id: string;
  title: string;
  usage_count: number;
}

export interface FitnessLeaderboardEntry {
  user_id: string;
  score: number;
  rank_position: number;
}

export interface FitnessTopExercise {
  exercise_id: string;
  name: string;
  completion_count: number;
}

export interface FitnessDashboardKpis {
  metrics: FitnessDashboardMetrics;
  top_challenges: FitnessTopChallenge[];
  most_used_plans: FitnessMostUsedPlan[];
  fitcoin_leaderboard: FitnessLeaderboardEntry[];
  top_exercises: FitnessTopExercise[];
}

// Empty-cache-safe defaults — the RPC returns `{}` until the
// `refresh_fitness_dashboard_job` cron has run at least once (see KPIs.sql),
// so every field is optional at the wire level and we backfill here.
const EMPTY_FITNESS_DASHBOARD_KPIS: FitnessDashboardKpis = {
  metrics: {
    total_fitness_users: 0,
    active_plans: 0,
    live_challenges: 0,
    exercise_library_count: 0,
    fitcoins_issued: 0,
    ai_generated_plans: 0,
    active_workouts: 0,
    avg_streak: 0,
    avg_completion: 0,
  },
  top_challenges: [],
  most_used_plans: [],
  fitcoin_leaderboard: [],
  top_exercises: [],
};

// Powers the KPI row + DashboardTab on the Fitness admin page via the
// `get_fitness_dashboard_kpis` Postgres RPC (see KPIs.sql). That RPC just
// reads the single-row `fitness_dashboard_cache` table, which is refreshed
// every 10 minutes by a pg_cron job (`refresh_fitness_dashboard_job`) — so
// this data can lag up to ~10 minutes behind live state by design.
export const useFitnessDashboardKpis = () => {
  return useQuery({
    queryKey: ["fitness-dashboard-kpis"],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase.rpc("get_fitness_dashboard_kpis");

      if (error) throw error;

      const payload = (data ?? {}) as Partial<FitnessDashboardKpis>;

      return {
        metrics: {
          ...EMPTY_FITNESS_DASHBOARD_KPIS.metrics,
          ...payload.metrics,
        },
        top_challenges: payload.top_challenges ?? [],
        most_used_plans: payload.most_used_plans ?? [],
        fitcoin_leaderboard: payload.fitcoin_leaderboard ?? [],
        top_exercises: payload.top_exercises ?? [],
      } as FitnessDashboardKpis;
    },
    // The cache refreshes server-side every 10 min; re-fetching more often
    // than that just re-reads the same row, so keep this cheap.
    staleTime: 5 * 60 * 1000,
  });
};
