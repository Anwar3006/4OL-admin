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

// Epic 18.7 read this table directly from the browser (it replaced a hardcoded
// 3-row array in ScheduleTab). It goes through /api/fitness/content-schedule
// now: the only thing that made the browser read work was an RLS policy
// granting `public` — every role, anon included — full access to the table.
// See features/fitness/api/content-schedule.ts.
//
// No title column exists on this table — `reference_id` points at a different
// table depending on `content_type` (fitness_plans/fitness_generated_workouts
// for "workout", fitness_challenges for "challenge", etc.), so callers fall
// back to `metadata.title` when present rather than guessing which table to
// join.
export const useFitnessContentSchedule = () => {
  return useQuery({
    queryKey: ["fitness-content-schedule"],
    queryFn: async (): Promise<FitnessScheduledContent[]> => {
      const res = await fetch("/api/fitness/content-schedule");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Unable to load the content schedule");
      }
      const { schedule } = await res.json();
      return (schedule ?? []) as FitnessScheduledContent[];
    },
  });
};
