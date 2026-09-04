import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BodyMapQuerySchema = z.object({
  bodySystem: z
    .enum(["all", "cardiovascular", "nervous", "skeletal", "respiratory"])
    .default("all"),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

type BodyPartRow = {
  id: string;
  name: string;
  parent_id: string | null;
  mesh_id: string | null;
  path: string;
  level: number | null;
  body_system?: string | null;
  gender_scope?: string | null;
  icon?: string | null;
  description?: string | null;
  display_order?: number | null;
};

const systemKeywords: Record<string, string[]> = {
  cardiovascular: ["heart", "artery", "vein", "blood", "cardiac", "vascular"],
  nervous: ["brain", "nerve", "spinal", "neural", "head"],
  skeletal: ["bone", "skull", "spine", "rib", "joint", "knee", "arm", "leg"],
  respiratory: ["lung", "throat", "nose", "airway", "bronch", "chest"],
};

function inferSystem(part: BodyPartRow) {
  const haystack = `${part.name} ${part.path ?? ""} ${part.mesh_id ?? ""}`
    .toLowerCase()
    .replace(/[_-]/g, " ");

  for (const [system, keywords] of Object.entries(systemKeywords)) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return system;
    }
  }

  return "general";
}

const EXTENDED_COLUMNS =
  "id, name, parent_id, mesh_id, path, level, body_system, gender_scope, icon, description, display_order";
const BASE_COLUMNS = "id, name, parent_id, mesh_id, path, level";

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("anatomy.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = BodyMapQuerySchema.safeParse({
    bodySystem: req.nextUrl.searchParams.get("bodySystem") || "all",
    limit: req.nextUrl.searchParams.get("limit") || "100",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  // Prefer the anatomy_extension columns; fall back to the base select when
  // the migration hasn't been applied yet (fresh environments).
  let partsData: BodyPartRow[] | null = null;
  let partsLoadError: { message: string } | null = null;

  const extendedResult = await admin
    .from("body_parts")
    .select(EXTENDED_COLUMNS)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("level", { ascending: true })
    .order("name", { ascending: true })
    .limit(parsed.data.limit);

  if (extendedResult.error) {
    const baseResult = await admin
      .from("body_parts")
      .select(BASE_COLUMNS)
      .order("level", { ascending: true })
      .order("name", { ascending: true })
      .limit(parsed.data.limit);
    partsData = (baseResult.data ?? []) as BodyPartRow[];
    partsLoadError = baseResult.error;
  } else {
    partsData = (extendedResult.data ?? []) as BodyPartRow[];
  }

  const [symptomLinksResult, conditionLinksResult] = await Promise.all([
    admin.from("symptom_body_parts").select("body_part_id"),
    admin.from("condition_body_parts").select("body_part_id"),
  ]);

  if (partsLoadError) {
    console.error("[anatomy/body-map] body parts error:", partsLoadError.message);
    return NextResponse.json(
      { error: "Failed to load body parts." },
      { status: 500 },
    );
  }

  if (symptomLinksResult.error || conditionLinksResult.error) {
    console.error(
      "[anatomy/body-map] link count error:",
      symptomLinksResult.error?.message || conditionLinksResult.error?.message,
    );
    return NextResponse.json(
      { error: "Failed to load anatomy link counts." },
      { status: 500 },
    );
  }

  const symptomCounts = new Map<string, number>();
  const conditionCounts = new Map<string, number>();

  for (const link of symptomLinksResult.data ?? []) {
    symptomCounts.set(
      link.body_part_id,
      (symptomCounts.get(link.body_part_id) ?? 0) + 1,
    );
  }

  for (const link of conditionLinksResult.data ?? []) {
    conditionCounts.set(
      link.body_part_id,
      (conditionCounts.get(link.body_part_id) ?? 0) + 1,
    );
  }

  const parts = (partsData ?? [])
    .map((part) => ({
      ...part,
      body_system: part.body_system || inferSystem(part),
      symptom_count: symptomCounts.get(part.id) ?? 0,
      condition_count: conditionCounts.get(part.id) ?? 0,
    }))
    .filter(
      (part) =>
        parsed.data.bodySystem === "all" ||
        part.body_system === parsed.data.bodySystem,
    );

  return NextResponse.json({
    parts,
    total: parts.length,
    system: parsed.data.bodySystem,
  });
}

const CreateBodyPartSchema = z.object({
  name: z.string().trim().min(2).max(120),
  parent_id: z.uuid().optional().nullable(),
  body_system: z.string().trim().max(60).optional(),
  gender_scope: z
    .enum(["female", "male", "shared", "unspecified"])
    .default("unspecified"),
  icon: z.string().trim().max(16).optional(),
  description: z.string().trim().max(2000).optional(),
  display_order: z.number().int().min(0).max(10000).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("anatomy.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = CreateBodyPartSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body part payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // body_parts.path (ltree) and level are derived by the
  // trg_body_parts_set_path trigger from parent_id + name — see migration
  // 20260904_anatomy_breasts_and_symptom_backfill.sql. Before that trigger
  // existed this insert always failed on path's NOT NULL constraint.
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("body_parts")
    .insert({
      name: parsed.data.name,
      parent_id: parsed.data.parent_id ?? null,
      body_system: parsed.data.body_system ?? null,
      gender_scope: parsed.data.gender_scope,
      icon: parsed.data.icon ?? null,
      description: parsed.data.description ?? null,
      display_order: parsed.data.display_order ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[anatomy/body-map] create error:", error.code, error.message);

    // Surface the causes an admin can actually act on instead of a blanket 500.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `A body part named "${parsed.data.name}" already exists.` },
        { status: 409 },
      );
    }
    if (error.code === "23503") {
      return NextResponse.json(
        { error: "The selected parent body part no longer exists." },
        { status: 400 },
      );
    }
    if (error.code === "23514") {
      return NextResponse.json(
        { error: "Invalid gender scope for this body part." },
        { status: 400 },
      );
    }
    // P0001 = raise exception from trg_body_parts_set_path (unusable name, or
    // a parent row that vanished mid-request).
    if (error.code === "P0001") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.code === "23502") {
      return NextResponse.json(
        {
          error:
            "Could not derive the body-part path. Apply migration " +
            "20260904_anatomy_breasts_and_symptom_backfill.sql, which installs " +
            "the trg_body_parts_set_path trigger.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create body part." },
      { status: 500 },
    );
  }

  return NextResponse.json({ part: data }, { status: 201 });
}
