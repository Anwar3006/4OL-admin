import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isRestrictedIbpType, RESTRICTED_TYPE_WARNING } from "@/lib/ibp-constants";

const IBPQuerySchema = z.object({
  status: z.string().trim().max(40).optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const RegisterIbpSchema = z
  .object({
    business_name: z.string().trim().min(2).max(160),
    business_category: z.string().trim().min(2).max(80),
    specific_category: z.string().trim().max(120).optional(),
    owner_name: z.string().trim().max(120).optional(),
    phone_number: z.string().trim().max(30).optional(),
    whatsapp_number: z.string().trim().max(30).optional(),
    website: z.string().trim().max(200).optional(),
    region: z.string().trim().max(80).optional(),
    district: z.string().trim().max(80).optional(),
    city: z.string().trim().max(80).optional(),
    street: z.string().trim().max(160).optional(),
    branches: z.coerce.number().int().min(1).max(500).default(1),
    founded_year: z.coerce.number().int().min(1800).max(2100).optional(),
    tin_number: z.string().trim().max(40).optional(),
    rgd_number: z.string().trim().max(60).optional(),
    registration_docs: z.array(z.string().trim().max(500)).default([]),
    plan: z.enum(["free", "standard", "premium", "featured"]).default("free"),
    skip_verification: z.boolean().default(false),
    admin_notes: z.string().trim().max(1000).optional(),
  })
  .refine((data) => !isRestrictedIbpType(data.business_category), {
    message: RESTRICTED_TYPE_WARNING,
    path: ["business_category"],
  });

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("ibp.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = IBPQuerySchema.safeParse({
    status: req.nextUrl.searchParams.get("status") || undefined,
    search: req.nextUrl.searchParams.get("search") || undefined,
    limit: req.nextUrl.searchParams.get("limit") || undefined,
    offset: req.nextUrl.searchParams.get("offset") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  let query = admin
    .from("ibp")
    .select(
      "id, business_name, business_category, specific_category, city, region, district, phone_number, whatsapp_number, website, status, is_featured, campaign_budget, total_spend, verified_at, rejection_reason, admin_notes, branches, founded_year, tin_number, registration_docs, suspended_reason, suspended_by, suspended_at, created_at",
      { count: "exact" },
    );

  if (parsed.data.status) {
    // Comma-separated list lets tabs match several statuses in one request
    // (e.g. "active,approved" — legacy rows used "approved").
    const statuses = parsed.data.status.split(",").map((s) => s.trim()).filter(Boolean);
    query = statuses.length === 1 ? query.eq("status", statuses[0]) : query.in("status", statuses);
  }
  if (parsed.data.search) {
    query = query.or(
      `business_name.ilike.%${parsed.data.search}%,business_category.ilike.%${parsed.data.search}%,city.ilike.%${parsed.data.search}%,region.ilike.%${parsed.data.search}%`,
    );
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(parsed.data.offset, parsed.data.offset + parsed.data.limit - 1);

  if (error) {
    console.error("[ibp] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load IBP businesses." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    businesses: data ?? [],
    total: count ?? 0,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });
}

/** Register a new IBP business (mockup `m-register-ibp`). */
export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("ibp.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = RegisterIbpSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid IBP registration", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("ibp")
    .insert({
      business_name: body.business_name,
      business_category: body.business_category,
      specific_category: body.specific_category ?? null,
      phone_number: body.phone_number ?? null,
      whatsapp_number: body.whatsapp_number ?? null,
      website: body.website ?? null,
      region: body.region ?? null,
      district: body.district ?? null,
      city: body.city ?? null,
      branches: body.branches,
      founded_year: body.founded_year ?? null,
      tin_number: body.tin_number ?? null,
      registration_docs: [
        ...(body.rgd_number ? [{ type: "rgd", reference: body.rgd_number }] : []),
        ...body.registration_docs.map((url) => ({ type: "document", reference: url })),
      ],
      status: body.skip_verification ? "active" : "pending",
      verified_at: body.skip_verification ? now : null,
      verified_by: body.skip_verification ? auth.user.id : null,
      is_featured: body.plan === "featured" || body.plan === "premium",
      admin_notes: body.admin_notes ?? null,
    })
    .select("id, business_name, status")
    .single();

  if (error) {
    console.error("[ibp POST] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to register IBP business." },
      { status: 500 },
    );
  }

  await admin.from("ibp_activity_log").insert({
    ibp_id: data.id,
    admin_id: auth.user.id,
    action: "registered",
    details: {
      plan: body.plan,
      skip_verification: body.skip_verification,
      owner_name: body.owner_name ?? null,
      street: body.street ?? null,
    },
  });

  return NextResponse.json({ business: data }, { status: 201 });
}
