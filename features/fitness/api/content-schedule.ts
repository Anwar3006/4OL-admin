import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

/**
 * GET /api/fitness/content-schedule — backs the Schedule tab.
 *
 * This exists to close an RLS hole rather than for its own sake. The tab used
 * to read `fitness_content_schedule` straight from the browser, and the only
 * reason that worked is an `admin_full_access_fit_sched` policy written
 * `FOR ALL TO public USING (true)` — and `public` in Postgres is every role,
 * `anon` included. That made the table world-readable and world-writable to
 * anyone holding the publishable key, which ships in the web bundle and in
 * every installed Expo build.
 *
 * It was the last of the nine tables found by the E1.3 sweep, and the only one
 * that could not be closed immediately, because dropping the policy while the
 * browser still did the reading would have blanked this tab silently — the
 * exact failure mode the epic exists to remove. Service role reads it now, so
 * the policy is gone.
 *
 * No title column exists on this table: `reference_id` points at a different
 * table depending on `content_type`, so callers fall back to `metadata.title`
 * rather than guessing which table to join.
 */
export async function GET() {
  const auth = await requireAdminApiUser("fitness.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("fitness_content_schedule")
    .select("id, content_type, reference_id, target_audience, scheduled_at, status, metadata")
    .order("scheduled_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Unable to load the content schedule" }, { status: 500 });
  }

  return NextResponse.json({ schedule: data ?? [] });
}
