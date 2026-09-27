/**
 * GET|POST /api/hcp — HCP registry (Gap Analysis Part J).
 *
 * GET: guarded list with filters (search, profession, issuing_body, status,
 * region) + pagination + metrics + group chats with member counts (J11).
 * Kept backward-compatible: verifications/groupChats/metrics keys unchanged.
 *
 * POST: onboarding (J4). hcp_verifications.user_id is NOT NULL UNIQUE, so
 * onboarding links to an existing user profile looked up by email — creating
 * auth users from the admin panel stays out of scope (Part C territory).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApiUser("hcp.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const search = searchParams.get("search")?.trim();
  const profession = searchParams.get("profession");
  const issuingBody = searchParams.get("issuing_body");
  const status = searchParams.get("status");
  const region = searchParams.get("region");

  const supabase = getAdminClient();
  const query = supabase
    .from("hcp_verifications")
    .select(
      "id, user_id, license_number, license_type, issuing_body, license_expiry, specialty, years_of_practice, profession_type, affiliated_facility_id, affiliated_facility_name, region, group_chat_id, can_respond_enquiries, year_licensed, documents, verification_status, verified_by, verified_at, rejection_reason, next_verification_due, created_at, user_profiles!hcp_verifications_user_id_fkey(first_name, last_name, phone_number, status, role, last_active), facility_profile(facility_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (profession) {
    const list = profession.split(",").map((item) => item.trim()).filter(Boolean);
    if (list.length > 1) query.in("profession_type", list);
    else query.eq("profession_type", list[0] ?? profession);
  }
  if (issuingBody) query.ilike("issuing_body", issuingBody);
  if (status) query.eq("verification_status", status);
  if (region) query.eq("region", region);

  const from = (page - 1) * limit;
  const { data: pageRows, count, error } = await query.range(from, from + limit - 1);
  if (error) {
    console.error("[hcp] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load HCP data." },
      { status: 500 },
    );
  }

  // Search spans the joined user name; PostgREST cannot .or across embeds,
  // so filter in-memory for name matches after the page query.
  const verifications = search
    ? (pageRows ?? []).filter((row: any) => {
        const fullName =
          `${row.user_profiles?.first_name ?? ""} ${row.user_profiles?.last_name ?? ""}`.toLowerCase();
        return (
          fullName.includes(search.toLowerCase()) ||
          (row.license_number ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (row.specialty ?? "").toLowerCase().includes(search.toLowerCase())
        );
      })
    : pageRows ?? [];

  // Memberships are the canonical affiliation source. The legacy fields on
  // hcp_verifications remain visible only as a fallback for historical rows.
  const userIds = verifications.map((row: any) => row.user_id).filter(Boolean);
  const [membershipsResult, listingsResult] = userIds.length === 0
    ? [{ data: [] as any[] }, { data: [] as any[] }]
    : await Promise.all([
        supabase
          .from("provider_members")
          .select("user_id, provider_id, job_title, status, providers!inner(name, status)")
          .in("user_id", userIds)
          .eq("status", "active"),
        supabase
          .from("providers")
          .select("id, owner_id, provider_types!inner(listing_entity)")
          .in("owner_id", userIds)
          .eq("status", "active")
          .eq("provider_types.listing_entity", "person"),
      ]);
  if (membershipsResult.error || listingsResult.error) {
    return NextResponse.json({ error: membershipsResult.error?.message ?? listingsResult.error?.message }, { status: 500 });
  }
  const membershipsByUser = new Map<string, any[]>();
  for (const membership of membershipsResult.data ?? []) {
    const provider = Array.isArray((membership as any).providers)
      ? (membership as any).providers[0]
      : (membership as any).providers;
    if (provider?.status !== "active") continue;
    const existing = membershipsByUser.get((membership as any).user_id) ?? [];
    existing.push({ provider_id: (membership as any).provider_id, name: provider?.name ?? "Provider", job_title: (membership as any).job_title ?? null });
    membershipsByUser.set((membership as any).user_id, existing);
  }
  const listingByOwner = new Map<string, string>();
  for (const listing of listingsResult.data ?? []) listingByOwner.set((listing as any).owner_id, (listing as any).id);
  const enrichedVerifications = verifications.map((row: any) => ({
    ...row,
    memberships: membershipsByUser.get(row.user_id) ?? [],
    own_listing_id: listingByOwner.get(row.user_id) ?? null,
  }));

  const [chatsResult, membersResult] = await Promise.all([
    supabase
      .from("conversations")
      .select(
        "id, name, group_name, group_category, is_verified_only, is_flagged, flagged_reason, last_message_at, max_members, created_at",
      )
      .eq("type", "group")
      .or("group_category.ilike.%hcp%,group_category.ilike.%health%,is_verified_only.eq.true")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(50),
    supabase.from("conversation_members").select("conversation_id"),
  ]);

  if (chatsResult.error) {
    console.error("[hcp] Supabase error:", chatsResult.error.message);
    return NextResponse.json(
      { error: "Failed to load HCP data." },
      { status: 500 },
    );
  }

  const memberCounts = new Map<string, number>();
  for (const member of membersResult.data ?? []) {
    memberCounts.set(
      member.conversation_id,
      (memberCounts.get(member.conversation_id) ?? 0) + 1,
    );
  }

  const groupChats = (chatsResult.data ?? []).map((chat: any) => ({
    ...chat,
    member_count: memberCounts.get(chat.id) ?? 0,
  }));

  return NextResponse.json({
    verifications: enrichedVerifications,
    groupChats,
    meta: {
      total: count ?? verifications.length,
      totalPages: Math.ceil((count ?? 0) / limit),
      currentPage: page,
    },
    metrics: {
      totalHcp: count ?? verifications.length,
      pending: verifications.filter((item: any) =>
        ["pending", "under_review"].includes(String(item.verification_status)),
      ).length,
      verified: verifications.filter(
        (item: any) => item.verification_status === "verified",
      ).length,
      expiring: verifications.filter((item: any) => {
        if (!item.license_expiry) return false;
        const expiry = new Date(item.license_expiry).getTime();
        return expiry < Date.now() + 1000 * 60 * 60 * 24 * 45;
      }).length,
      groupChats: groupChats.length,
    },
  });
}

const ONBOARD_SCHEMA = z.object({
  user_email: z.string().email(),
  license_number: z.string().min(1),
  license_type: z.string().min(1),
  issuing_body: z.string().min(1),
  license_expiry: z.string().min(1),
  specialty: z.string().optional(),
  profession_type: z.string().optional(),
  years_of_practice: z.number().int().optional(),
  year_licensed: z.number().int().optional(),
  affiliated_facility_id: z.string().uuid().optional(),
  affiliated_facility_name: z.string().optional(),
  region: z.string().optional(),
  group_chat_id: z.string().uuid().optional(),
  can_respond_enquiries: z.boolean().optional(),
  documents: z.array(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdminApiUser("hcp.create");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ONBOARD_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const supabase = getAdminClient();
  const { data: user, error: userError } = await supabase
    .from("user_profiles")
    .select("user_id, first_name, last_name")
    .ilike("email", parsed.data.user_email)
    .limit(1)
    .maybeSingle();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json(
      { error: "No user profile matches that email — onboard the user account first." },
      { status: 400 },
    );
  }

  const { data: inserted, error } = await supabase
    .from("hcp_verifications")
    .insert({
      user_id: user.user_id,
      license_number: parsed.data.license_number,
      license_type: parsed.data.license_type,
      issuing_body: parsed.data.issuing_body,
      license_expiry: parsed.data.license_expiry,
      specialty: parsed.data.specialty ?? null,
      profession_type: parsed.data.profession_type ?? null,
      years_of_practice: parsed.data.years_of_practice ?? null,
      year_licensed: parsed.data.year_licensed ?? null,
      affiliated_facility_id: parsed.data.affiliated_facility_id ?? null,
      affiliated_facility_name: parsed.data.affiliated_facility_name ?? null,
      region: (parsed.data.region as never) ?? null,
      group_chat_id: parsed.data.group_chat_id ?? null,
      can_respond_enquiries: parsed.data.can_respond_enquiries ?? false,
      documents: parsed.data.documents ?? [],
      verification_status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    const conflict =
      error.code === "23505" || error.message?.includes("duplicate");
    return NextResponse.json(
      {
        error: conflict
          ? "This user already has an HCP verification record."
          : error.message,
      },
      { status: conflict ? 409 : 500 },
    );
  }

  await supabase.rpc("log_admin_activity", {
    p_admin_id: auth.user.id,
    p_action_type: "hcp_onboarded",
    p_target_table: "hcp_verifications",
    p_record_id: inserted?.id ?? null,
    p_description: `HCP onboarding submitted for ${user.first_name ?? ""} ${user.last_name ?? ""} (${parsed.data.user_email}) — pending verification`,
    p_severity: "info",
    p_old_data: null,
    p_new_data: { user_id: user.user_id, profession_type: parsed.data.profession_type ?? null },
  });

  return NextResponse.json({ ok: true, id: inserted?.id });
}
