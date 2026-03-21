"use server";

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { headers } from "next/headers";

/**
 * Fetch the current user's profile using the admin client.
 * This bypasses RLS and is secure because it validates the BetterAuth session first.
 */
export async function getUserProfile() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { data: null, error: "Unauthorized" };
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
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
 * Restricted to Admins/Super Admins.
 */
export async function getProfileById(targetId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { data: null, error: "Unauthorized" };
  }

  const admin = getSupabaseAdmin();

  // 1. Verify caller's role
  const { data: callerProfile, error: callerError } = await admin
    .from("user_profiles")
    .select("role")
    .eq("user_id", session.user.id)
    .single();

  if (callerError || !["Super Admin", "Admin"].includes(callerProfile?.role)) {
    return { data: null, error: "Unauthorized: Admin access required" };
  }

  // 2. Fetch target profile
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

/**
 * Update a specific user's profile.
 * Restricted to Admins/Super Admins.
 */
export async function updateProfileById(id: string, formData: any) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const admin = getSupabaseAdmin();

  // 1. Verify caller's role
  const { data: callerProfile, error: callerError } = await admin
    .from("user_profiles")
    .select("role")
    .eq("user_id", session.user.id)
    .single();

  if (callerError || !["Super Admin", "Admin"].includes(callerProfile?.role)) {
    return { error: "Unauthorized: Admin access required" };
  }

  // 2. Cleanup formData (don't update system fields)
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

/**
 * Fetch all user profiles with pagination.
 * Restricted to Admins/Super Admins.
 */
export async function getAllProfiles(pageIndex: number, pageSize: number) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { data: [], count: 0, error: "Unauthorized" };
  }

  const admin = getSupabaseAdmin();

  // 1. Verify caller's role
  const { data: callerProfile, error: callerError } = await admin
    .from("user_profiles")
    .select("role")
    .eq("user_id", session.user.id)
    .single();

  if (callerError || !["Super Admin", "Admin"].includes(callerProfile?.role)) {
    return { data: [], count: 0, error: "Unauthorized: Admin access required" };
  }

  // 2. Fetch profiles
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
