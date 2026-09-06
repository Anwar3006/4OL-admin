import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

// IBP products & services listing + single-item review
// (Gap Analysis Part C, tab 5).

const ProductsQuerySchema = z.object({
  status: z.enum(["pending", "published", "rejected", "flagged"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("ibp.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = ProductsQuerySchema.safeParse({
    status: req.nextUrl.searchParams.get("status") || undefined,
    limit: req.nextUrl.searchParams.get("limit") || undefined,
    offset: req.nextUrl.searchParams.get("offset") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  let query = admin
    .from("ibp_products")
    .select("*", { count: "exact" });

  if (parsed.data.status) query = query.eq("status", parsed.data.status);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(parsed.data.offset, parsed.data.offset + parsed.data.limit - 1);

  if (error) {
    // ibp_products appears with the users_ibp_extension migration.
    if (error.code === "42P01") {
      return NextResponse.json({ products: [], total: 0, migration_missing: true });
    }
    console.error("[ibp/products GET] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to load IBP products." }, { status: 500 });
  }

  // Resolve business names in one pass.
  const ibpIds = Array.from(new Set((data ?? []).map((p) => p.ibp_id)));
  const { data: businesses } = ibpIds.length
    ? await admin.from("ibp").select("id, business_name").in("id", ibpIds)
    : { data: [] as { id: string; business_name: string }[] };
  const nameById = new Map((businesses ?? []).map((b) => [b.id, b.business_name]));

  return NextResponse.json({
    products: (data ?? []).map((p) => ({
      ...p,
      business_name: nameById.get(p.ibp_id) ?? "—",
    })),
    total: count ?? 0,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });
}

const ReviewSchema = z.object({
  id: z.uuid(),
  action: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(500).optional(),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminApiUser("ibp.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = ReviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid review action", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("ibp_products")
    .update({
      status: parsed.data.action === "approve" ? "published" : "rejected",
      rejection_reason: parsed.data.action === "reject" ? parsed.data.reason ?? null : null,
      reviewed_by: auth.user.id,
      reviewed_at: now,
    })
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[ibp/products PATCH] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to review product." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
