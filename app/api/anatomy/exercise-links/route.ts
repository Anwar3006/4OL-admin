import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Anatomy ⇄ Fitness junction (fitness_body_parts).
 *
 * Mirrors /api/anatomy/drug-links. The junction column is `workout_id` for
 * historical reasons but points at `fitness_exercises.id`.
 *
 * Goes through the service-role client because fitness_body_parts has RLS
 * enabled with a read-only policy for `authenticated` — writes from the
 * browser client would be silently rejected.
 */

const ExerciseLinkQuerySchema = z.object({
  body_part_id: z.string().uuid().optional(),
  workout_id: z.string().uuid().optional(),
  search: z.string().trim().max(160).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const ExerciseLinkPayloadSchema = z.object({
  body_part_id: z.string().uuid(),
  workout_id: z.string().uuid(),
});

type ExerciseBodyPartLinkRow = {
  body_part_id: string;
  workout_id: string;
  source: string | null;
  body_parts?: { id: string; name: string; body_system: string | null } | null;
  fitness_exercises?: {
    id: string;
    exercise_name: string;
    category: string | null;
    primary_muscle_group: string | null;
    secondary_muscles: string | null;
    difficulty_level: string | null;
    equipment_required: string | null;
    tier: string | null;
    status: string | null;
    is_active: boolean | null;
  } | null;
};

const EXERCISE_EMBED =
  "id, exercise_name, category, primary_muscle_group, secondary_muscles, difficulty_level, equipment_required, tier, status, is_active";

const SELECT_COLUMNS = [
  "body_part_id",
  "workout_id",
  "source",
  "body_parts(id, name, body_system)",
  `fitness_exercises(${EXERCISE_EMBED})`,
].join(", ");

// Same shape, but the embed is an inner join so filters applied to it narrow
// the junction rows (and the exact count) instead of returning null embeds.
const SELECT_COLUMNS_INNER = [
  "body_part_id",
  "workout_id",
  "source",
  "body_parts(id, name, body_system)",
  `fitness_exercises!inner(${EXERCISE_EMBED})`,
].join(", ");

const normalizeLink = (row: ExerciseBodyPartLinkRow) => ({
  body_part_id: row.body_part_id,
  body_part_name: row.body_parts?.name ?? "—",
  body_system: row.body_parts?.body_system ?? null,
  workout_id: row.workout_id,
  exercise_name: row.fitness_exercises?.exercise_name ?? "—",
  category: row.fitness_exercises?.category ?? null,
  primary_muscle_group: row.fitness_exercises?.primary_muscle_group ?? null,
  secondary_muscles: row.fitness_exercises?.secondary_muscles ?? null,
  difficulty_level: row.fitness_exercises?.difficulty_level ?? null,
  equipment_required: row.fitness_exercises?.equipment_required ?? null,
  tier: row.fitness_exercises?.tier ?? null,
  status: row.fitness_exercises?.status ?? null,
  is_active: row.fitness_exercises?.is_active ?? null,
  source: row.source ?? null,
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("anatomy.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = ExerciseLinkQuerySchema.safeParse({
    body_part_id: req.nextUrl.searchParams.get("body_part_id") || undefined,
    workout_id: req.nextUrl.searchParams.get("workout_id") || undefined,
    search: req.nextUrl.searchParams.get("search") || undefined,
    page: req.nextUrl.searchParams.get("page") || undefined,
    limit: req.nextUrl.searchParams.get("limit") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid exercise-link query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { page, limit, search, body_part_id, workout_id } = parsed.data;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Filter, sort, count and paginate in Postgres. The previous version pulled
  // 300 rows and filtered in JS, so with 4k+ links the table showed an
  // arbitrary slice, searched only within that slice, and reported a bogus
  // total. fitness_body_parts_body_part_idx makes the body-part filter an
  // index scan rather than a sequential scan.
  const admin = getSupabaseAdmin();
  let query = admin
    .from("fitness_body_parts")
    // !inner so a search on the embedded exercise filters the junction rows
    // rather than nulling the embed out.
    .select(search ? SELECT_COLUMNS_INNER : SELECT_COLUMNS, { count: "exact" })
    .order("body_part_id", { ascending: true })
    .order("workout_id", { ascending: true })
    .range(from, to);

  if (body_part_id) query = query.eq("body_part_id", body_part_id);
  if (workout_id) query = query.eq("workout_id", workout_id);
  if (search) {
    const escaped = search.replace(/[%_]/g, (ch) => `\\${ch}`);
    query = query.ilike("fitness_exercises.exercise_name", `%${escaped}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("[anatomy/exercise-links] load error:", error.message);
    return NextResponse.json(
      { error: "Failed to load exercise body-part links." },
      { status: 500 },
    );
  }

  const links = ((data ?? []) as unknown as ExerciseBodyPartLinkRow[])
    .map(normalizeLink)
    .sort((a, b) => {
      const partCmp = a.body_part_name.localeCompare(b.body_part_name);
      return partCmp || a.exercise_name.localeCompare(b.exercise_name);
    });

  const total = count ?? links.length;
  return NextResponse.json({
    links,
    total,
    page,
    limit,
    pageCount: Math.max(1, Math.ceil(total / limit)),
    hasMore: to + 1 < total,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("anatomy.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = ExerciseLinkPayloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "body_part_id and workout_id are required.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("fitness_body_parts")
    .upsert({ ...parsed.data, source: "manual" }, {
      onConflict: "workout_id,body_part_id",
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    console.error("[anatomy/exercise-links] create error:", error.message);
    return NextResponse.json(
      { error: "Failed to link exercise to body part." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    link: normalizeLink(data as unknown as ExerciseBodyPartLinkRow),
  });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminApiUser("anatomy.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = ExerciseLinkPayloadSchema.safeParse({
    body_part_id: req.nextUrl.searchParams.get("body_part_id"),
    workout_id: req.nextUrl.searchParams.get("workout_id"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "body_part_id and workout_id query params are required." },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("fitness_body_parts")
    .delete()
    .eq("body_part_id", parsed.data.body_part_id)
    .eq("workout_id", parsed.data.workout_id);

  if (error) {
    console.error("[anatomy/exercise-links] delete error:", error.message);
    return NextResponse.json(
      { error: "Failed to unlink exercise from body part." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
