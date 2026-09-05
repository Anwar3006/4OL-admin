import { getSupabaseClient } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export interface FitnessScheduledContent {
  id: string;
  content_type: "workout" | "challenge" | "broadcast" | "article";
  reference_id: string | null;
  target_audience: string | null;
  scheduled_at: string;
  status: string | null;
  metadata: Record<string, unknown> | null;
}

// Epic 18.7: real query against `fitness_content_schedule` (was a hardcoded
// 3-row array in ScheduleTab.tsx). No title column exists on this table —
// `reference_id` points at a different table depending on `content_type`
// (fitness_plans/fitness_generated_workouts for "workout", fitness_challenges
// for "challenge", etc.), so callers fall back to `metadata.title` when
// present rather than guessing which table to join.
export const useFitnessContentSchedule = () => {
  return useQuery({
    queryKey: ["fitness-content-schedule"],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("fitness_content_schedule")
        .select(
          "id, content_type, reference_id, target_audience, scheduled_at, status, metadata"
        )
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as FitnessScheduledContent[];
    },
  });
};
