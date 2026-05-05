"use server";

import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { headers } from "next/headers";

// ── shared helper ─────────────────────────────────────────────────────────────
/**
 * Returns the authenticated user from the Supabase cookie session.
 * Used by all server actions in this file.
 */
async function getSessionUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.id) return null;
  return user;
}

// ── getUserProfile ────────────────────────────────────────────────────────────
export async function getUserProfile() {
  const user = await getSessionUser();
  if (!user) return { data: null, error: "Unauthorized" };

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
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

// ── getProfileById ────────────────────────────────────────────────────────────
export async function getProfileById(targetId: string) {
  const user = await getSessionUser();
  if (!user) return { data: null, error: "Unauthorized" };

  const admin = getSupabaseAdmin();

  const { data: callerProfile, error: callerError } = await admin
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (callerError || !["super_admin", "admin"].includes(callerProfile?.role)) {
    return { data: null, error: "Unauthorized: Admin access required" };
  }

  try {
    const { data, error } = await admin
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

// ── updateProfileById ─────────────────────────────────────────────────────────
export async function updateProfileById(id: string, formData: any) {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };

  const admin = getSupabaseAdmin();

  const { data: callerProfile, error: callerError } = await admin
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (callerError || !["super_admin", "admin"].includes(callerProfile?.role)) {
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
    const { error } = await admin
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

// ── getAllProfiles ─────────────────────────────────────────────────────────────
export async function getAllProfiles(pageIndex: number, pageSize: number) {
  const user = await getSessionUser();
  if (!user) return { data: [], count: 0, error: "Unauthorized" };

  const admin = getSupabaseAdmin();

  const { data: callerProfile, error: callerError } = await admin
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (callerError || !["super_admin", "admin"].includes(callerProfile?.role)) {
    return { data: [], count: 0, error: "Unauthorized: Admin access required" };
  }

  try {
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await admin
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

// ── getUsers ──────────────────────────────────────────────────────────────────
export async function getUsers(params: {
  page: number;
  limit: number;
  admin?: boolean;
  status?: string;
  search?: string;
  userType?: string;
}) {
  const user = await getSessionUser();
  if (!user) return { data: [], count: 0, error: "Unauthorized" };

  const admin = getSupabaseAdmin();
  const from = (params.page - 1) * params.limit;
  const to = from + params.limit - 1;
  const isAdminQuery = params.admin === true;

  // ── Main data query ───────────────────────────────────────────────────────
  let query = admin.from("user_profiles").select(
    "*",
    { count: "exact" },
  );

  if (isAdminQuery) {
    query = query.in("role", ["admin", "super_admin", "registrar"]);
  } else {
    query = query.eq("role", "user");
  }

  if (params.userType === "business") {
    query = query.in("user_type", ["business_provider", "both"]);
  } else if (params.userType) {
    query = query.eq("user_type", params.userType);
  }

  if (params.status) {
    query = query.eq("status", params.status);
  }

  if (params.search) {
    query = query.or(
      `first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,phone_number.ilike.%${params.search}%`,
    );
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  // ── Stats query ───────────────────────────────────────────────────────────
  let statsQuery = admin.from("user_profiles").select("status");

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

  // Flatten profile + email into a single object for consumers
  const userData = await Promise.all(
    (data || []).map(async (row) => {
      const profile = row as any;
      let email = profile.email || "";

      if (!email && profile.user_id) {
        try {
          const authRes = await admin.auth.admin.getUserById(profile.user_id);
          if (authRes.data?.user?.email) {
            email = authRes.data.user.email;
          }
        } catch (e) {
          // ignore error and leave email blank
        }
      }

      return {
        ...profile,
        email,
        name: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "—",
      };
    })
  );

  return {
    users: userData as any[],
    meta: {
      total: count || 0,
      totalPages: Math.ceil((count || 0) / params.limit),
      currentPage: params.page,
    },
    analytics,
  } as any;
}
