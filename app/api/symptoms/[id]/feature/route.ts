/**
 * PUT/DELETE /api/symptoms/[id]/feature — symptoms carousel slot management
 * (Analytics/Carousels build, Phase 5b). Parity with
 * /api/diseases/[id]/feature: cap = 12, server-side enforcement, bulk ids.
 *
 * PUT body: { featured?: boolean, position?: number, ids?: string[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { CAROUSEL_SLOT_CAP, setCarouselSlots } from "@/lib/carousel-slots";

const FEATURE_SCHEMA = z.object({
  ids: z.array(z.string().uuid()).min(1).max(CAROUSEL_SLOT_CAP).optional(),
  featured: z.boolean().default(true),
  position: z.number().int().min(1).max(CAROUSEL_SLOT_CAP).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("symptoms.feature");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = FEATURE_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const ids = parsed.data.ids ?? [id];
  const result = await setCarouselSlots(
    "symptoms",
    ids,
    parsed.data.featured,
    parsed.data.position,
  );
  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: result.capped ? 409 : 500 },
    );
  }

  await getSupabaseAdmin().rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: parsed.data.featured ? "symptom_featured" : "symptom_unfeatured",
    p_target_table: "symptoms",
    p_record_id: ids[0] ?? null,
    p_description: `${result.count} symptom(s) ${
      parsed.data.featured ? "featured on carousel" : "removed from carousel"
    }`,
    p_severity: "info",
    p_old_data: null,
    p_new_data: { ids, featured: parsed.data.featured },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("symptoms.feature");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const result = await setCarouselSlots("symptoms", [id], false);
  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, updated: result.count });
}
