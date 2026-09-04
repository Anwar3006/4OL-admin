import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  MAX_BATCH_SIZE,
  runAiPinMapping,
  type MappingContentType,
} from "@/lib/anatomy/ai-pin-mapper";

/**
 * AI Pin Mapper (Gap Analysis Part AL, AL-D8).
 * GET  — review queue (proposed/approved/rejected suggestions)
 * POST — run the LLM mapping batch for a content type
 */

const CONTENT_TYPES: MappingContentType[] = [
  "condition",
  "symptom",
  "tip",
  "workout",
  "drug",
];

const NAME_SOURCES: Record<MappingContentType, { table: string; nameCol: string }> = {
  condition: { table: "conditions", nameCol: "name" },
  symptom: { table: "symptoms", nameCol: "name" },
  tip: { table: "healthy_living_info", nameCol: "name" },
  workout: { table: "fitness_exercises", nameCol: "exercise_name" },
  drug: { table: "drugs", nameCol: "name" },
};

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("anatomy.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const status = req.nextUrl.searchParams.get("status") ?? "proposed";
  const contentType = req.nextUrl.searchParams.get("content_type");
  const admin = getSupabaseAdmin();

  let query = admin
    .from("ai_body_part_mappings")
    .select("*, body_parts(id, name, body_system)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (["proposed", "approved", "rejected"].includes(status)) {
    query = query.eq("status", status);
  }
  if (contentType && CONTENT_TYPES.includes(contentType as MappingContentType)) {
    query = query.eq("content_type", contentType);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ mappings: [], applied: false });
  }

  // Resolve content display names per type.
  const mappings = data ?? [];
  const names = new Map<string, string>();
  for (const type of CONTENT_TYPES) {
    const ids = [
      ...new Set(
        mappings.filter((m) => m.content_type === type).map((m) => m.content_id),
      ),
    ];
    if (ids.length === 0) continue;
    const src = NAME_SOURCES[type];
    const { data: rows } = await admin
      .from(src.table)
      .select(`id, ${src.nameCol}`)
      .in("id", ids.slice(0, 300));
    for (const row of (rows ?? []) as unknown as Array<Record<string, unknown>>) {
      names.set(`${type}:${row.id}`, row[src.nameCol] as string);
    }
  }

  return NextResponse.json({
    mappings: mappings.map((m) => ({
      ...m,
      content_name: names.get(`${m.content_type}:${m.content_id}`) ?? "(content)",
    })),
    applied: true,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("anatomy.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const body = await req.json().catch(() => null);
  const contentType = body?.content_type as MappingContentType;
  if (!CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: `content_type must be one of: ${CONTENT_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const result = await runAiPinMapping({
    contentType,
    unmappedOnly: body?.unmapped_only !== false,
    batchSize: Math.min(Number(body?.batch_size) || 10, MAX_BATCH_SIZE),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result);
}
