import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { INTERACTION_SEVERITIES } from "@/lib/shared-constants";

const InteractionQuerySchema = z.object({
  search: z.string().trim().max(160).optional(),
  severity: z.enum(INTERACTION_SEVERITIES).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("medication.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = InteractionQuerySchema.safeParse({
    search: req.nextUrl.searchParams.get("search") || undefined,
    severity: req.nextUrl.searchParams.get("severity") || undefined,
    limit: req.nextUrl.searchParams.get("limit") || undefined,
    offset: req.nextUrl.searchParams.get("offset") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid interaction query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  let query = admin
    .from("drug_interactions")
    .select(
      "id, severity, effect, recommended_action, source, is_active, created_at, drug_a:drugs!drug_interactions_drug_a_id_fkey(id, name, generic_name), drug_b:drugs!drug_interactions_drug_b_id_fkey(id, name, generic_name)",
      { count: "exact" },
    )
    .eq("is_active", true);

  if (parsed.data.severity) query = query.eq("severity", parsed.data.severity);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(parsed.data.offset, parsed.data.offset + parsed.data.limit - 1);

  if (error) {
    console.error("[medication/interactions] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load drug interactions." },
      { status: 500 },
    );
  }

  let items = data ?? [];
  if (parsed.data.search) {
    const q = parsed.data.search.toLowerCase();
    items = items.filter((row) => {
      const names = [
        (row.drug_a as { name?: string } | null)?.name,
        (row.drug_b as { name?: string } | null)?.name,
        row.effect,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return names.includes(q);
    });
  }

  // Flags (30d) per interaction pair — feeds the mockup's "Flags 30d" column
  // and the AI Checker KPI. Bounded: one extra aggregate query.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: flags } = await admin
    .from("drug_interaction_flags")
    .select("interaction_id")
    .gte("flagged_at", thirtyDaysAgo);
  const flagCounts = new Map<string, number>();
  for (const flag of flags ?? []) {
    flagCounts.set(flag.interaction_id, (flagCounts.get(flag.interaction_id) ?? 0) + 1);
  }
  const itemsWithFlags = items.map((row) => ({
    ...row,
    flags_30d: flagCounts.get(row.id) ?? 0,
  }));

  return NextResponse.json({
    interactions: itemsWithFlags,
    total: count ?? 0,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });
}

const CreateInteractionSchema = z.object({
  drug_a_id: z.uuid(),
  drug_b_id: z.uuid(),
  severity: z.enum(INTERACTION_SEVERITIES),
  effect: z.string().trim().max(800).optional().nullable(),
  recommended_action: z.string().trim().max(800).optional().nullable(),
}).refine((v) => v.drug_a_id !== v.drug_b_id, {
  message: "A drug cannot interact with itself",
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("medication.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = CreateInteractionSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid interaction payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("drug_interactions")
    .insert({ ...parsed.data, source: "admin", created_by: auth.user.id })
    .select()
    .single();

  if (error) {
    console.error("[medication/interactions] create error:", error.message);
    return NextResponse.json(
      { error: "Failed to create interaction." },
      { status: 500 },
    );
  }

  return NextResponse.json({ interaction: data }, { status: 201 });
}
