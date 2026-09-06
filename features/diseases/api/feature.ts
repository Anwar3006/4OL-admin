/**
 * PUT/DELETE /api/diseases/[id]/feature — carousel slot management
 * (Gap Analysis Part I, I1/I6/I-D3). The enforced slot cap is 12
 * (the management surface; home-screen rotation is app-side).
 *
 * PUT body: { featured?: boolean, position?: number, ids?: string[] }
 *   - featured=true assigns the next free slot (or `position`)
 *   - featured=false (or DELETE) removes from the carousel
 *   - `ids` enables the bulk "Feature Selected" action (path id ignored)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

export const CAROUSEL_SLOT_CAP = 12;

const FEATURE_SCHEMA = z.object({
  ids: z.array(z.string().uuid()).min(1).max(CAROUSEL_SLOT_CAP).optional(),
  featured: z.boolean().default(true),
  position: z.number().int().min(1).max(CAROUSEL_SLOT_CAP).optional(),
});

async function setFeatured(ids: string[], featured: boolean, position?: number) {
  const admin = getAdminClient();

  if (!featured) {
    const { data, error } = await admin
      .from("conditions")
      .update({ is_featured: false, featured_order: null })
      .in("id", ids)
      .select("id");
    return { error, count: data?.length ?? 0 };
  }

  // Current occupancy decides whether the cap allows more slots.
  const { data: current, error: countError } = await admin
    .from("conditions")
    .select("id")
    .eq("is_featured", true);
  if (countError) return { error: countError, count: 0 };

  const alreadyFeatured = new Set((current ?? []).map((r: any) => r.id));
  const newAdds = ids.filter((id) => !alreadyFeatured.has(id));
  if (alreadyFeatured.size + newAdds.length > CAROUSEL_SLOT_CAP) {
    return {
      error: {
        message: `Carousel is full — up to ${CAROUSEL_SLOT_CAP} conditions can be featured (I-D3).`,
      },
      count: 0,
      capped: true,
    };
  }

  // Next free order value (positions are 1-based in the UI).
  const { data: occupied } = await admin
    .from("conditions")
    .select("featured_order")
    .eq("is_featured", true);
  const used = new Set(
    (occupied ?? [])
      .map((r: any) => r.featured_order)
      .filter((n: unknown) => typeof n === "number"),
  );
  let nextOrder = position ?? 1;
  const orders: number[] = [];
  for (let i = 0; i < newAdds.length; i++) {
    if (position !== undefined) {
      orders.push(position + i);
      continue;
    }
    while (used.has(nextOrder)) nextOrder += 1;
    used.add(nextOrder);
    orders.push(nextOrder);
  }

  let count = 0;
  for (let i = 0; i < ids.length; i++) {
    const isReorder = alreadyFeatured.has(ids[i]);
    const order =
      position !== undefined
        ? (isReorder ? position : orders.shift() ?? position)
        : orders.shift() ?? nextOrder++;
    const { error } = await admin
      .from("conditions")
      .update({
        is_featured: true,
        featured_order: order,
        featured_from: new Date().toISOString(),
      })
      .eq("id", ids[i]);
    if (error) return { error, count };
    count += 1;
  }
  return { error: null, count };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("diseases.feature");
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
  const result = await setFeatured(ids, parsed.data.featured, parsed.data.position);
  if (result.error) {
    return NextResponse.json(
      { error: (result.error as { message: string }).message },
      { status: result.capped ? 409 : 500 },
    );
  }

  await getAdminClient().rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: parsed.data.featured
      ? "condition_featured"
      : "condition_unfeatured",
    p_target_table: "conditions",
    p_record_id: ids[0] ?? null,
    p_description: `${result.count} condition(s) ${
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
  const auth = await requireAdminApiUser("diseases.feature");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const result = await setFeatured([id], false);
  if (result.error) {
    return NextResponse.json(
      { error: (result.error as { message: string }).message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, updated: result.count });
}
