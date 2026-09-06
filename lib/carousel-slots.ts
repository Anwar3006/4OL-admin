/**
 * Carousel slot management shared by the Symptoms and Healthy Living feature
 * routes (Analytics/Carousels build, Phase 5b). Same semantics as
 * PUT /api/diseases/[id]/feature: cap = 12 per content type, next-free-slot
 * assignment, bulk ids, 409 when full.
 */

import { getAdminClient } from "@/lib/db/admin";

export const CAROUSEL_SLOT_CAP = 12;

type CarouselTable = "symptoms" | "healthy_living_info";

export interface FeatureResult {
  error: { message: string } | null;
  count: number;
  capped?: boolean;
}

export async function setCarouselSlots(
  table: CarouselTable,
  ids: string[],
  featured: boolean,
  position?: number,
): Promise<FeatureResult> {
  const admin = getAdminClient();

  if (!featured) {
    const { data, error } = await admin
      .from(table)
      .update({ is_featured: false, featured_order: null })
      .in("id", ids)
      .select("id");
    return { error, count: data?.length ?? 0 };
  }

  // Current occupancy decides whether the cap allows more slots.
  const { data: current, error: countError } = await admin
    .from(table)
    .select("id")
    .eq("is_featured", true);
  if (countError) return { error: countError, count: 0 };

  const alreadyFeatured = new Set((current ?? []).map((r: any) => r.id));
  const newAdds = ids.filter((id) => !alreadyFeatured.has(id));
  if (alreadyFeatured.size + newAdds.length > CAROUSEL_SLOT_CAP) {
    return {
      error: {
        message: `Carousel is full — up to ${CAROUSEL_SLOT_CAP} items can be featured.`,
      },
      count: 0,
      capped: true,
    };
  }

  // Next free order value (positions are 1-based in the UI).
  const { data: occupied } = await admin
    .from(table)
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
    const { data, error } = await admin
      .from(table)
      .update({
        is_featured: true,
        featured_order: order,
        featured_from: new Date().toISOString(),
      })
      .eq("id", ids[i])
      .select("id");
    if (error) return { error, count };
    // Count rows the update actually matched, not ids we looped over. Without
    // the .select() this incremented unconditionally, so featuring an id that
    // no longer exists returned {"ok":true,"updated":1} and wrote an audit
    // entry describing a change that never happened. The unfeature path above
    // already counted honestly, so the two disagreed.
    count += data?.length ?? 0;
  }
  return { error: null, count };
}
