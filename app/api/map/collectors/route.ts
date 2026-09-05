import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Collector management (Gap Analysis Part F, phase 4). Staff location data is
// sensitive PII: reads require users.view, writes require users.edit (F-D6).
export async function GET() {
  const auth = await requireAdminApiUser("users.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  // No email in the embed below: user_profiles has no such column, and asking
  // for one fails the whole query ("column user_profiles_1.email does not
  // exist"), 500ing the collectors tab. The address lives in auth.users, which
  // PostgREST does not expose, and public."user" has no FK to join on — so
  // surfacing it needs a service-role lookup or a view, not a select.
  //
  // Note this select is a template literal: a // comment inside it becomes
  // part of the select string and PostgREST rejects the lot.
  const { data, error } = await admin
    .from("map_collectors")
    .select(
      `
      id, user_id, assigned_region, gps_status, notes, created_at,
      user:user_profiles(first_name, last_name, phone_number, role)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Attach per-collector footprint totals.
  const { data: footprintRows } = await admin
    .from("collector_footprints")
    .select("collector_id, created_at");

  const totals = new Map<string, { points: number; lastActive: string | null }>();
  for (const fp of (footprintRows ?? []) as Array<{
    collector_id: string;
    created_at: string;
  }>) {
    const entry = totals.get(fp.collector_id) ?? { points: 0, lastActive: null };
    entry.points += 1;
    if (!entry.lastActive || fp.created_at > entry.lastActive) {
      entry.lastActive = fp.created_at;
    }
    totals.set(fp.collector_id, entry);
  }

  const collectors = (data ?? []).map((row: any) => ({
    ...row,
    footprint_points: totals.get(row.user_id)?.points ?? 0,
    last_active: totals.get(row.user_id)?.lastActive ?? null,
  }));

  return NextResponse.json({ collectors });
}

const CreateCollectorSchema = z.object({
  userId: z.uuid(),
  assignedRegion: z.string().trim().min(1).nullable(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("users.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = CreateCollectorSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("map_collectors")
    .insert({
      user_id: parsed.data.userId,
      assigned_region: parsed.data.assignedRegion,
      notes: parsed.data.notes ?? null,
    })
    .select("id, user_id, assigned_region")
    .single();

  if (error) {
    const message = error.code === "23505"
      ? "This user is already registered as a collector."
      : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await admin.rpc("log_admin_activity", {
    p_admin_id: user.id,
    p_action_type: "add_collector",
    p_target_table: "map_collectors",
    p_record_id: String(data.id),
    p_description: `Added collector for user ${parsed.data.userId}${parsed.data.assignedRegion ? ` in ${parsed.data.assignedRegion}` : ""}`,
  });

  return NextResponse.json({ success: true, collector: data });
}
