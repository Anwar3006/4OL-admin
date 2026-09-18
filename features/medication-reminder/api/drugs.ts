import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import {
  DRUG_AVAILABILITY,
  DRUG_CATEGORIES,
  DRUG_STATUSES,
} from "@/lib/shared-constants";
import { getObviousNonDrugReason } from "@/features/medication-reminder/data/drug-catalog-validation";

const DrugQuerySchema = z.object({
  search: z.string().trim().max(160).optional(),
  category: z.string().trim().max(80).optional(),
  status: z.enum(DRUG_STATUSES).optional(),
  availability: z.enum(DRUG_AVAILABILITY).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("medication.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = DrugQuerySchema.safeParse({
    search: req.nextUrl.searchParams.get("search") || undefined,
    category: req.nextUrl.searchParams.get("category") || undefined,
    status: req.nextUrl.searchParams.get("status") || undefined,
    availability: req.nextUrl.searchParams.get("availability") || undefined,
    limit: req.nextUrl.searchParams.get("limit") || undefined,
    offset: req.nextUrl.searchParams.get("offset") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid drug query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  let query = admin
    .from("drugs")
    .select(
      "id, name, generic_name, slug, category, availability, dosage_form, strength, strength_unit, pack_size, manufacturer, active_ingredients, conditions_treated, status, source, metadata, created_at, updated_at",
      { count: "exact" },
    );

  if (parsed.data.search) {
    query = query.or(
      `name.ilike.%${parsed.data.search}%,generic_name.ilike.%${parsed.data.search}%,category.ilike.%${parsed.data.search}%`,
    );
  }
  if (parsed.data.category) query = query.eq("category", parsed.data.category);
  if (parsed.data.status) query = query.eq("status", parsed.data.status);
  if (parsed.data.availability) {
    query = query.eq("availability", parsed.data.availability);
  }

  const { data, error, count } = await query
    .order("name", { ascending: true })
    .range(parsed.data.offset, parsed.data.offset + parsed.data.limit - 1);

  if (error) {
    console.error("[medication/drugs] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load drug catalog." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    drugs: data ?? [],
    total: count ?? 0,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });
}

const DrugPayloadSchema = z.object({
  name: z.string().trim().min(2).max(240),
  generic_name: z.string().trim().max(240).optional().nullable(),
  slug: z.string().trim().max(240).optional().nullable(),
  category: z.enum(DRUG_CATEGORIES).optional().nullable(),
  availability: z.enum(DRUG_AVAILABILITY).default("unknown"),
  dosage_form: z.string().trim().max(80).optional().nullable(),
  strength: z.string().trim().max(60).optional().nullable(),
  strength_unit: z.string().trim().max(20).optional().nullable(),
  pack_size: z.number().int().positive().max(100000).optional().nullable(),
  manufacturer: z.string().trim().max(160).optional().nullable(),
  active_ingredients: z.array(z.string().trim().min(1).max(160)).max(40).default([]),
  conditions_treated: z.array(z.string().trim().min(1).max(160)).max(40).default([]),
  atc_code: z.string().trim().max(20).optional().nullable(),
  status: z.enum(DRUG_STATUSES).default("active"),
  source: z.enum(["excel_import", "admin", "user_submission", "api_verification"]).default("admin"),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("medication.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = DrugPayloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid drug payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const payload = parsed.data;
  const nonDrugReason = getObviousNonDrugReason({
    name: payload.name,
    genericName: payload.generic_name,
  });
  if (nonDrugReason) {
    return NextResponse.json(
      { error: `This entry appears not to be a medicine (${nonDrugReason}).` },
      { status: 422 },
    );
  }
  const { data, error } = await admin
    .from("drugs")
    .insert({
      name: payload.name,
      generic_name: payload.generic_name ?? null,
      slug:
        payload.slug ??
        payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 220),
      category: payload.category ?? null,
      availability: payload.availability,
      dosage_form: payload.dosage_form ?? null,
      strength: payload.strength ?? null,
      strength_unit: payload.strength_unit ?? null,
      pack_size: payload.pack_size ?? null,
      manufacturer: payload.manufacturer ?? null,
      active_ingredients: payload.active_ingredients,
      conditions_treated: payload.conditions_treated,
      atc_code: payload.atc_code ?? null,
      status: payload.status,
      source: payload.source,
      metadata: payload.metadata,
    })
    .select()
    .single();

  if (error) {
    console.error("[medication/drugs] create error:", error.message);
    return NextResponse.json(
      { error: "Failed to create drug." },
      { status: 500 },
    );
  }

  return NextResponse.json({ drug: data }, { status: 201 });
}
