import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const IBPQuerySchema = z.object({
  status: z.string().trim().max(40).optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      "id, business_name, business_category, specific_category, city, region, district, phone_number, whatsapp_number, website, status, is_featured, campaign_budget, total_spend, verified_at, created_at",
      { count: "exact" },
    );

  if (parsed.data.status) query = query.eq("status", parsed.data.status);
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
