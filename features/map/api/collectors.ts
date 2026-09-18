import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

// Collector management (Gap Analysis Part F, phase 4). Staff location data is
// sensitive PII: reads require users.view, writes require users.edit (F-D6).
//
// Backed by `registrars` — consolidated 2026-09-18 from data_collectors +
// map_collectors (see CLAUDE.md). That table's `region` is a text[] (a
// registrar can cover more than one region via facility-scout), but this
// tab's UI is still a single-region assignment, so the API keeps presenting
// a singular `assigned_region` (the first region in the array) rather than
// forcing a multi-region picker onto a flow nobody asked for.
export async function GET() {
  const auth = await requireAdminApiUser("users.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  // No email in the embed below: user_profiles has no such column, and asking
  // for one fails the whole query ("column user_profiles_1.email does not
  // exist"), 500ing the collectors tab. The address lives in auth.users, which
  // PostgREST does not expose, and public."user" has no FK to join on — so
  // surfacing it needs a service-role lookup or a view, not a select.
  //
  // Note this select is a template literal: a // comment inside it becomes
  // part of the select string and PostgREST rejects the lot.
  const { data, error } = await admin
    .from("registrars")
    .select(
      `
      id, user_id, region, gps_status, notes, created_at,
      user:user_profiles!registrars_user_id_fkey(first_name, last_name, phone_number, role)
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
    assigned_region: (row.region as string[] | null)?.[0] ?? null,
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

  const admin = getAdminClient();
  const region = parsed.data.assignedRegion ? [parsed.data.assignedRegion] : [];

  // registrars.employee_id is NOT NULL — a column map_collectors never had.
  // A registrar already provisioned via Facility Scout has a real one, which
  // an insert-only write would either violate (blind insert) or clobber with
  // a placeholder (blind upsert). So: update in place if a row exists for
  // this user, insert with a placeholder employee_id only if it doesn't.
  const { data: existing } = await admin
    .from("registrars")
    .select("id, employee_id")
    .eq("user_id", parsed.data.userId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "This user is already registered as a collector." },
      { status: 409 },
    );
  }

  const { data, error } = await admin
    .from("registrars")
    .insert({
      user_id: parsed.data.userId,
      employee_id: `MAP-${parsed.data.userId.slice(0, 8).toUpperCase()}`,
      region,
      gps_status: "active",
      notes: parsed.data.notes ?? null,
    })
    .select("id, user_id, region")
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
    p_target_table: "registrars",
    p_record_id: String(data.id),
    p_description: `Added collector for user ${parsed.data.userId}${parsed.data.assignedRegion ? ` in ${parsed.data.assignedRegion}` : ""}`,
  });

  return NextResponse.json({
    success: true,
    collector: { ...data, assigned_region: data.region?.[0] ?? null },
  });
}
