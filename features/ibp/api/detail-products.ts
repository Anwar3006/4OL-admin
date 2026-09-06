import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

// Per-IBP product list + admin product creation.

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("ibp.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("ibp_products")
    .select("*")
    .eq("ibp_id", id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ products: [], migration_missing: true });
    }
    console.error("[ibp/[id]/products GET] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to load products." }, { status: 500 });
  }

  return NextResponse.json({ products: data ?? [] });
}

const CreateProductSchema = z.object({
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().max(80).optional(),
  image_url: z.string().trim().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("ibp.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const parsed = CreateProductSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid product payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("ibp_products")
    .insert({
      ibp_id: id,
      name: parsed.data.name,
      category: parsed.data.category ?? null,
      image_url: parsed.data.image_url ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("[ibp/[id]/products POST] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to create product." }, { status: 500 });
  }

  return NextResponse.json({ product: data }, { status: 201 });
}
