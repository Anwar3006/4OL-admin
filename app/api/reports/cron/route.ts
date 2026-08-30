/**
 * /api/reports/cron — unattended report worker.
 *
 * Two responsibilities, in order:
 *   1. enqueue due schedules (same SQL function pg_cron uses, so both
 *      drivers stay idempotent),
 *   2. process the queued runs (collect → narrate → deliver).
 *
 * Auth: bearer token must match CRON_SECRET. Vercel cron sends this header
 * automatically when the env var is set; without CRON_SECRET the route
 * refuses to run so it can never be triggered anonymously.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { processReportQueue } from "@/lib/reports/processor";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  const header = req.headers.get("authorization") ?? "";
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let enqueued = 0;
  try {
    const { data, error } = await getSupabaseAdmin().rpc("enqueue_due_report_runs");
    if (error) throw new Error(error.message);
    enqueued = Number(data ?? 0);
  } catch (err) {
    // Pre-migration or transient DB failure: still try to drain whatever
    // is already queued, and report the enqueue error honestly.
    console.error("[reports/cron] enqueue failed:", (err as Error).message);
  }

  const processed = await processReportQueue().catch((err) => {
    console.error("[reports/cron] processing failed:", (err as Error).message);
    return { processed: 0, statuses: [] as string[] };
  });

  return NextResponse.json({ ok: true, enqueued, ...processed });
}
