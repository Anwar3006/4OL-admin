"use server";

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { headers } from "next/headers";

/**
 * Fetch the current user's profile using the admin client.
 * Bypasses RLS — secure because it validates the BetterAuth session first.
 */
export async function getUserProfile() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) return { data: null, error: "Unauthorized" };

  try {
    const adminClient = getSupabaseAdmin();
    const { data, error } = await adminClient
      .from("user_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error) {
      console.error("[getUserProfile] Supabase error:", error.message);
      return { data: null, error: error.message };
    }
    return { data, error: null };
  } catch (err: any) {
    console.error("[getUserProfile] Unexpected error:", err.message);
    return { data: null, error: err.message };
  }
}

/**
 * Fetch a specific user's profile by ID.
 * Restricted to Admins / Super Admins.
 */
export async function getProfileById(targetId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { data: null, error: "Unauthorized" };

  const adminClient = getSupabaseAdmin();

  const { data: callerProfile, error: callerError } = await adminClient
    .from("user_profiles")
    .select("role")
    .eq("user_id", session.user.id)
    .single();

  if (callerError || !["Super Admin", "Admin"].includes(callerProfile?.role)) {
    return { data: null, error: "Unauthorized: Admin access required" };
  }

  try {
    const { data, error } = await adminClient
      .from("user_profiles")
      .select("*")
      .eq("id", targetId)
      .single();

    if (error) {
      console.error("[getProfileById] Supabase error:", error.message);
      return { data: null, error: error.message };
    }
    return { data, error: null };
  } catch (err: any) {
    console.error("[getProfileById] Unexpected error:", err.message);
    return { data: null, error: err.message };
  }
}

/**
 * Update a specific user's profile.
 * Restricted to Admins / Super Admins.
 */
export async function updateProfileById(id: string, formData: any) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { error: "Unauthorized" };

  const adminClient = getSupabaseAdmin();

  const { data: callerProfile, error: callerError } = await adminClient
    .from("user_profiles")
    .select("role")
    .eq("user_id", session.user.id)
    .single();

  if (callerError || !["Super Admin", "Admin"].includes(callerProfile?.role)) {
    return { error: "Unauthorized: Admin access required" };
  }

  const {
    id: _id,
    user_id: _uid,
    created_at: _ca,
    updated_at: _ua,
    ...updateData
  } = formData;

  try {
    const { error } = await adminClient
      .from("user_profiles")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("[updateProfileById] Supabase error:", error.message);
      return { error: error.message };
    }
    return { error: null };
  } catch (err: any) {
    console.error("[updateProfileById] Unexpected error:", err.message);
    return { error: err.message };
  }
}

/**
 * Fetch all user profiles with pagination.
 * Restricted to Admins / Super Admins.
 */
export async function getAllProfiles(pageIndex: number, pageSize: number) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { data: [], count: 0, error: "Unauthorized" };

  const adminClient = getSupabaseAdmin();

  const { data: callerProfile, error: callerError } = await adminClient
    .from("user_profiles")
    .select("role")
    .eq("user_id", session.user.id)
    .single();

  if (callerError || !["Super Admin", "Admin"].includes(callerProfile?.role)) {
    return { data: [], count: 0, error: "Unauthorized: Admin access required" };
  }

  try {
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await adminClient
      .from("user_profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[getAllProfiles] Supabase error:", error.message);
      return { data: [], count: 0, error: error.message };
    }
    return { data: data || [], count: count || 0, error: null };
  } catch (err: any) {
    console.error("[getAllProfiles] Unexpected error:", err.message);
    return { data: [], count: 0, error: err.message };
  }
}

/**
 * Fetch paginated users for the dashboard.
 *
 * params.admin = true  → fetch staff accounts (admin / super_admin / registrar)
 * params.admin = false → fetch app users (role = "user"), optionally filtered
 *                        by user_type ("customer" | "business_provider" | "both")
 *
 * The "business_provider" table in UserSection also includes "both" users
 * because they have an active business profile.
 */
export async function getUsers(params: {
  page: number;
  limit: number;
  admin?: boolean;
  status?: string;
  search?: string;
  /**
   * "customer"           → users who are purely consumers
   * "business_provider"  → IBP accounts only
   * "both"               → accounts with both profiles
   * "business"           → convenience alias: returns business_provider + both
   * undefined            → no user_type filter (returns all matching role)
   */
  userType?: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { data: [], count: 0, error: "Unauthorized" };
  }

  // ── Rename to adminClient to avoid shadowing params.admin ────────────────
  const adminClient = getSupabaseAdmin();

  const from = (params.page - 1) * params.limit;
  const to   = from + params.limit - 1;
  const isAdminQuery = params.admin === true;

  // ── Main data query ───────────────────────────────────────────────────────
  // Join the BetterAuth `user` table to get name + email.
  let query = adminClient.from("user_profiles").select(
    `
      *,
      user:user (
        id,
        name,
        email,
        created_at
      )
    `,
    { count: "exact" },
  );

  // Role filter
  if (isAdminQuery) {
    query = query.in("role", ["admin", "super_admin", "registrar"]);
  } else {
    query = query.eq("role", "user");
  }

  // User-type filter
  // "business" is a convenience alias: includes business_provider + both users
  if (params.userType === "business") {
    query = query.in("user_type", ["business_provider", "both"]);
  } else if (params.userType) {
    query = query.eq("user_type", params.userType);
  }

  // Status filter
  if (params.status) {
    query = query.eq("status", params.status);
  }

  // Search filter
  if (params.search) {
    query = query.or(
      `first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,phone_number.ilike.%${params.search}%`,
    );
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  // ── Stats query (total counts by status for the same filter set) ──────────
  // Must reassign each chained call — Supabase JS v2 returns a new builder.
  let statsQuery = adminClient
    .from("user_profiles")
    .select("status");

  if (isAdminQuery) {
    statsQuery = statsQuery.in("role", ["admin", "super_admin", "registrar"]);
  } else {
    statsQuery = statsQuery.eq("role", "user");
    if (params.userType === "business") {
      statsQuery = statsQuery.in("user_type", ["business_provider", "both"]);
    } else if (params.userType) {
      statsQuery = statsQuery.eq("user_type", params.userType);
    }
  }

  const { data: statsData } = await statsQuery;

  const analytics = (statsData || []).reduce(
    (acc, curr) => {
      const key = curr.status as keyof typeof acc;
      if (key in acc) acc[key]++;
      return acc;
    },
    { active: 0, pending: 0, inactive: 0, suspended: 0 },
  );

  // Flatten the BetterAuth user join onto the profile row so consumers get
  // a single object with both profile fields (first_name, phone_number, …)
  // and auth fields (name, email).
  const userData = (data || []).map((row) => {
    const authUser = row.user ?? {};
    return {
      ...row,
      ...authUser,
      // Build a display name: prefer BetterAuth's `name` field, fall back to
      // concatenating first_name + last_name from user_profiles.
      name:
        authUser.name ||
        [row.first_name, row.last_name].filter(Boolean).join(" ") ||
        "—",
      // Ensure email is always present at the top level
      email: authUser.email ?? row.email ?? "",
    };
  });

  return {
    users: userData as any[],
    meta: {
      total:        count || 0,
      totalPages:   Math.ceil((count || 0) / params.limit),
      currentPage:  params.page,
    },
    analytics,
  } as any;
}
