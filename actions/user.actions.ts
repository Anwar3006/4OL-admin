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
      .eq("user_id", targetId)
      .single();

    if (error) {
      console.error("[getProfileById] Supabase error:", error.message);
      return { data: null, error: error.message };
    }

    let email = (data as any)?.email || "";
    if (!email && data?.user_id) {
      try {
        const authRes = await admin.auth.admin.getUserById(data.user_id);
        if (authRes.data?.user?.email) email = authRes.data.user.email;
      } catch {
        // ignore, leave email blank
      }
    }

    return {
      data: {
        ...data,
        email,
        name: [data?.first_name, data?.last_name].filter(Boolean).join(" ") || "—",
      },
      error: null,
    };
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
      .eq("user_id", id);

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

// ── flagUserProfile ───────────────────────────────────────────────────────────
export async function flagUserProfile(targetId: string, reason: string) {
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

  try {
    const { error } = await admin
      .from("user_profiles")
      .update({
        is_flagged: true,
        flag_reason: reason,
        flagged_at: new Date().toISOString(),
        flagged_by: user.id,
      })
      .eq("user_id", targetId);

    if (error) {
      console.error("[flagUserProfile] Supabase error:", error.message);
      return { error: error.message };
    }
    return { error: null };
  } catch (err: any) {
    console.error("[flagUserProfile] Unexpected error:", err.message);
    return { error: err.message };
  }
}

// ── clearUserFlag ─────────────────────────────────────────────────────────────
export async function clearUserFlag(targetId: string) {
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

  try {
    const { error } = await admin
      .from("user_profiles")
      .update({
        is_flagged: false,
        flag_reason: null,
        flagged_at: null,
        flagged_by: null,
      })
      .eq("user_id", targetId);

    if (error) {
      console.error("[clearUserFlag] Supabase error:", error.message);
      return { error: error.message };
    }
    return { error: null };
  } catch (err: any) {
    console.error("[clearUserFlag] Unexpected error:", err.message);
    return { error: err.message };
  }
}

// ── getFlaggedUsers ───────────────────────────────────────────────────────────
export async function getFlaggedUsers(pageIndex: number, pageSize: number) {
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
      .eq("is_flagged", true)
      .order("flagged_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[getFlaggedUsers] Supabase error:", error.message);
      return { data: [], count: 0, error: error.message };
    }

    const userData = (data || []).map((profile: any) => ({
      ...profile,
      name: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "—",
    }));

    return { data: userData, count: count || 0, error: null };
  } catch (err: any) {
    console.error("[getFlaggedUsers] Unexpected error:", err.message);
    return { data: [], count: 0, error: err.message };
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

  // user_profiles.status's real CHECK vocabulary is
  // active/inactive/suspended/banned/pending_verification — 'pending' has
  // never been a valid value, so this reducer always undercounted (pending
  // stuck at 0) and silently dropped 'banned' rows from every bucket.
  const analytics = (statsData || []).reduce(
    (acc, curr) => {
      if (curr.status === "pending_verification") acc.pending++;
      else if (curr.status === "banned") acc.suspended++;
      else if (curr.status in acc) acc[curr.status as keyof typeof acc]++;
      return acc;
    },
    { active: 0, pending: 0, inactive: 0, suspended: 0 },
  );

  // Batch-fetch all auth users once to resolve emails (avoids N+1 getUserById calls)
  const { data: authUsers } = await admin.auth.admin.listUsers();
  const emailMap = new Map(
    (authUsers?.users || []).map((u) => [u.id, u.email || ""]),
  );

  const userData = (data || []).map((row) => {
    const profile = row as any;
    const email = profile.email || emailMap.get(profile.user_id) || "";

    return {
      ...profile,
      email,
      name: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "—",
    };
  });

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

// ── setUserAuthBan ────────────────────────────────────────────────────────────
/**
 * Revokes (or restores) a user's ability to sign in, at the Supabase Auth layer.
 *
 * This is the only place that actually works. The delete-account flow used to
 * "ban" by setting `banned: true` on the BetterAuth `user` table — a table
 * nothing reads any more — so approved deletion requests never revoked access
 * despite the mobile app promising "your login access will be immediately
 * revoked". Setting `user_profiles.status = 'banned'` alongside it isn't
 * enough either: that status is only consulted by the admin panel
 * (lib/admin-api-auth.ts, PermissionsProvider), never by the mobile client.
 *
 * `ban_duration` is enforced by GoTrue itself, so it blocks every client —
 * mobile included — and invalidates existing sessions.
 *
 * Requires service-role, hence a server action rather than a client-side call.
 */
export async function setUserAuthBan(targetId: string, banned: boolean) {
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

  // GoTrue expects a Go duration string; "none" lifts the ban. There is no
  // "forever", so this is ~100 years — the grace period is reversible, and a
  // completed deletion removes the account outright, so nothing relies on the
  // ban outliving that.
  const { error } = await admin.auth.admin.updateUserById(targetId, {
    ban_duration: banned ? "876000h" : "none",
  });

  if (error) {
    console.error("[setUserAuthBan] Supabase error:", error.message);
    return { error: error.message };
  }

  return { error: null };
}

// ── getDeviceAnalytics ────────────────────────────────────────────────────────

export interface DevicePlatformStat {
  platform: string;
  devices: number;
  users: number;
}

export interface DeviceModelStat {
  platform: string;
  device_name: string;
  devices: number;
  users: number;
}

export interface DeviceAnalytics {
  total_devices: number;
  total_users: number;
  active_30d: number;
  multi_device_users: number;
  by_platform: DevicePlatformStat[];
  by_model: DeviceModelStat[];
  devices_per_user: { device_count: number; users: number }[];
}

/**
 * Aggregate view of the push-device registry (public.user_push_tokens).
 *
 * Goes through the get_device_analytics() RPC rather than selecting the table,
 * so the browser never receives raw Expo push tokens just to draw a chart.
 */
export async function getDeviceAnalytics(): Promise<{
  data: DeviceAnalytics | null;
  error: string | null;
}> {
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

  const { data, error } = await admin.rpc("get_device_analytics");

  if (error) {
    console.error("[getDeviceAnalytics] Supabase error:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data as DeviceAnalytics, error: null };
}
