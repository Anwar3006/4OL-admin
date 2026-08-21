/**
 * PUT|DELETE /api/facilities/[id]/top-rated — SA-only Top Rated leaderboard
 * (Gap Analysis Part H, H1/H4/H6, H-D5).
 *
 * PUT    { rank? }  — mark a facility top-rated. 10-slot cap enforced
 *                     server-side; rank defaults to the next free slot.
 *                     Sending rank for an existing member reorders the board.
 * DELETE            — remove a facility from the leaderboard.
 *
 * Replaces the client-side adminToggleFacilityTopRated write so enforcement
 * happens on the server behind facilities.feature.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const TOP_RATED_SLOT_CAP = 10;

const PUT_SCHEMA = z.object({
  rank: z.number().int().min(1).max(TOP_RATED_SLOT_CAP).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("facilities.feature");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = PUT_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: current, error: currentError } = await supabase
    .from("facility_profile")
    .select("id, is_top_rated, top_rated_rank")
    .eq("is_top_rated", true)
    .order("top_rated_rank", { ascending: true, nullsFirst: false });
  if (currentError) {
    return NextResponse.json({ error: currentError.message }, { status: 500 });
  }

  const board = current ?? [];
  const alreadyRanked = board.some((row) => row.id === id);

  if (!alreadyRanked && board.length >= TOP_RATED_SLOT_CAP) {
    return NextResponse.json(
      {
        error: `Top Rated is full (${TOP_RATED_SLOT_CAP} slots). Remove a facility before adding another.`,
      },
      { status: 409 },
    );
  }

  const rank =
    parsed.data.rank ??
    (alreadyRanked
      ? board.find((row) => row.id === id)?.top_rated_rank ?? board.length
      : board.length + 1);

  const { error } = await supabase
    .from("facility_profile")
    .update({
      is_top_rated: true,
      top_rated_rank: rank,
      top_rated_set_by: auth.user.id,
      top_rated_set_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "facility_top_rated_set",
    p_target_table: "facility_profile",
    p_record_id: id,
    p_description: `Facility set top-ranked at position ${rank}`,
    p_severity: "info",
    p_old_data: null,
    p_new_data: { rank },
  });

  return NextResponse.json({ ok: true, rank });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("facilities.feature");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("facility_profile")
    .update({
      is_top_rated: false,
      top_rated_rank: null,
      top_rated_set_by: null,
      top_rated_set_at: null,
    })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "facility_top_rated_removed",
    p_target_table: "facility_profile",
    p_record_id: id,
    p_description: "Facility removed from the Top Rated leaderboard",
    p_severity: "warning",
    p_old_data: null,
    p_new_data: null,
  });

  return NextResponse.json({ ok: true });
}
