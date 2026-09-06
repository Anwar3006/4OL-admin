/**
 * Server-side admin authentication and RBAC enforcement for /api/admin/*
 * route handlers.
 *
 * Layering:
 *   1. proxy.ts (edge) — session + coarse role gate for pages and /api/admin.
 *   2. This module — per-route fine-grained permission checks. The database
 *      function has_4ol_permission() is authoritative; ROLE_DEFAULTS from
 *      lib/permissions.ts is only a fallback for the window before the RBAC
 *      migration (20260817_rbac_permission_catalog.sql) has been applied.
 *
 * Denials are audit-logged to activity_logs on a best-effort basis.
 */

import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { SUPER_ADMIN_ROLE, isAdminRole, type AdminRole } from "@/lib/admin-roles";
import { ROLE_DEFAULTS, isRbacMigrationMissing } from "@/lib/permissions";
import { getServerClient } from "@/lib/db/server";
import { getAdminClient } from "@/lib/db/admin";

export interface AdminApiContext {
  user: User;
  role: AdminRole;
}

export type AdminCheckResult =
  | ({ ok: true } & AdminApiContext)
  | { ok: false; status: 401 | 403; error: string };

/**
 * Resolve the caller's Supabase user plus their platform role.
 * Returns null for anonymous callers, suspended accounts and non-admin roles.
 */
export async function getAdminApiContext(): Promise<AdminApiContext | null> {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role,status")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = profile?.role;
  if (!isAdminRole(role)) return null;

  const status = profile?.status ?? "active";
  if (status === "suspended" || status === "banned") return null;

  return { user, role };
}

/**
 * Backwards-compatible helper: returns the authenticated admin user or null.
 * New routes should prefer requireAdminApiUser() with a permission key.
 */
export async function getAdminApiUser(): Promise<User | null> {
  const ctx = await getAdminApiContext();
  return ctx?.user ?? null;
}

/**
 * Best-effort audit trail for rejected admin API calls. Never throws.
 */
async function logAdminDenial(
  userId: string | null,
  role: string | null,
  permission: string | null,
  reason: string,
): Promise<void> {
  try {
    const admin = getAdminClient();
    await admin.from("activity_logs").insert({
      actor_id: userId,
      actor_name: role ?? "unknown",
      action_type: "admin_api_denied",
      target_table: "api_admin",
      new_data: { permission, reason },
    });
  } catch {
    // Audit logging must never break the request path.
  }
}

/**
 * Require an authenticated admin, optionally holding a specific permission.
 *
 * super_admin bypasses every catalog check. For every other role the
 * database's has_4ol_permission() decides; if the RPC is unavailable the
 * static ROLE_DEFAULTS mirror is used as a fallback.
 */
export async function requireAdminApiUser(permission?: string): Promise<AdminCheckResult> {
  const ctx = await getAdminApiContext();
  if (!ctx) {
    await logAdminDenial(null, null, permission ?? null, "unauthenticated");
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  if (!permission || ctx.role === SUPER_ADMIN_ROLE) {
    return { ok: true, ...ctx };
  }

  const allowed = await checkPermission(ctx, permission);
  if (!allowed) {
    await logAdminDenial(ctx.user.id, ctx.role, permission, "missing_permission");
    return { ok: false, status: 403, error: `Missing permission: ${permission}` };
  }

  return { ok: true, ...ctx };
}

async function checkPermission(ctx: AdminApiContext, permission: string): Promise<boolean> {
  const supabase = await getServerClient();
  const { data, error } = await supabase.rpc("has_4ol_permission", {
    p_user_id: ctx.user.id,
    p_key: permission,
  });

  if (error) {
    if (isRbacMigrationMissing(error)) {
      // RPC absent (migration not applied yet) — degrade to the static mirror.
      console.warn(
        `[admin-api-auth] has_4ol_permission RPC unavailable (${error.message}); ` +
          "falling back to ROLE_DEFAULTS. Apply 20260817_rbac_permission_catalog.sql.",
      );
      const defaults = ROLE_DEFAULTS[ctx.role as Exclude<AdminRole, typeof SUPER_ADMIN_ROLE>] ?? [];
      return defaults.includes(permission);
    }
    // Any other failure (timeout, dropped connection, ...) must fail closed —
    // the static mirror can't see DB-side revokes, so silently degrading to
    // it here could re-grant an explicitly revoked permission.
    console.error(`[admin-api-auth] has_4ol_permission RPC failed (${error.message}); denying.`);
    return false;
  }

  return data === true;
}

/**
 * Full effective permission list for the caller — feeds the session endpoint,
 * nav filtering and the Roles matrix. super_admin returns the whole catalog
 * implicitly, signalled by returning null (meaning "all permissions").
 */
export async function getSessionPermissions(
  ctx: AdminApiContext,
): Promise<string[] | null> {
  if (ctx.role === SUPER_ADMIN_ROLE) return null;

  const supabase = await getServerClient();
  const { data, error } = await supabase.rpc("get_effective_admin_permissions", {
    p_user_id: ctx.user.id,
  });

  if (error) {
    if (isRbacMigrationMissing(error)) {
      console.warn(
        `[admin-api-auth] get_effective_admin_permissions RPC unavailable (${error.message}); ` +
          "falling back to ROLE_DEFAULTS.",
      );
      return ROLE_DEFAULTS[ctx.role as Exclude<AdminRole, typeof SUPER_ADMIN_ROLE>] ?? [];
    }
    console.error(`[admin-api-auth] get_effective_admin_permissions RPC failed (${error.message}); denying.`);
    return [];
  }

  return (data ?? []).map((row: { key: string }) => row.key);
}

/** Convenience: build a NextResponse from a failed requireAdminApiUser call. */
export function adminAuthErrorResponse(result: Extract<AdminCheckResult, { ok: false }>) {
  return NextResponse.json({ error: result.error }, { status: result.status });
}
