/**
 * GET /api/providers/[id]/catalogue — list, for the Catalogue tab.
 * PATCH /api/providers/[id]/catalogue/[itemId] — admin publish/reject a
 *   pending_review item. Owner writes go through upsert_catalogue_item()
 *   (mobile-side, not built here); this is the admin review half only.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import type { ProviderCatalogueItemRow } from "../schema/types";

const CATALOGUE_SELECT = [
  "id",
  "provider_id",
  "item_type",
  "name",
  "description",
  "category",
  "capability_required",
  "price",
  "currency",
  "unit",
  "duration_minutes",
  "stock_status",
  "status",
  "rejection_reason",
  "reviewed_by",
  "reviewed_at",
  "created_at",
  "updated_at",
].join(", ");

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("providers.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("provider_catalogue_items")
    .select(CATALOGUE_SELECT)
    .eq("provider_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: (data ?? []) as unknown as ProviderCatalogueItemRow[] });
}

const REVIEW_SCHEMA = z
  .object({
    status: z.enum(["published", "rejected"]),
    rejection_reason: z.string().max(2000).optional(),
  })
  .refine((val) => val.status !== "rejected" || (val.rejection_reason?.trim().length ?? 0) > 0, {
    message: "A reason is required to reject a catalogue item",
    path: ["rejection_reason"],
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const auth = await requireAdminApiUser("catalogue.review");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id, itemId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = REVIEW_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("provider_catalogue_items")
    .update({
      status: parsed.data.status,
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: parsed.data.status === "rejected" ? parsed.data.rejection_reason : null,
    })
    .eq("id", itemId)
    .eq("provider_id", id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Catalogue item not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
