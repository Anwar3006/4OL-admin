/**
 * GET /api/providers/[id]/reviews — list, for the Reviews tab.
 * PATCH /api/providers/[id]/reviews/[reviewId] — moderate (approve/reject),
 *   gated on the existing reviews.moderate permission (shared with the
 *   global Reviews & Ratings module).
 *
 * Scoped read of facility_reviews for one provider — not a replacement for
 * features/reviews, which covers the cross-provider moderation queue.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import type { ProviderReviewRow } from "../schema/types";

const REVIEWS_SELECT = [
  "id",
  "facility_id",
  "user_id",
  "parent_id",
  "rating",
  "comment_text",
  "is_anonymous",
  "is_verified_visit",
  "helpful_count",
  "status",
  "created_at",
  "user_profiles (first_name, last_name)",
].join(", ");

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApiUser("providers.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("facility_reviews")
    .select(REVIEWS_SELECT)
    .eq("facility_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows: ProviderReviewRow[] = (data ?? []).map((row: any) => {
    const author = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;
    const name = [author?.first_name, author?.last_name].filter(Boolean).join(" ");
    return {
      ...row,
      author_name: row.is_anonymous ? null : name || null,
    };
  });

  return NextResponse.json({ data: rows });
}

const MODERATE_SCHEMA = z.object({ status: z.enum(["approved", "rejected"]) });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> },
) {
  const auth = await requireAdminApiUser("reviews.moderate");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id, reviewId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = MODERATE_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("facility_reviews")
    .update({ status: parsed.data.status })
    .eq("id", reviewId)
    .eq("facility_id", id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
