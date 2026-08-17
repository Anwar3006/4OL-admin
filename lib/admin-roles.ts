/**
 * Canonical platform-role vocabulary.
 *
 * This is the SINGLE source of truth for role strings in application code.
 * proxy.ts, lib/admin-api-auth.ts and any role UI must import from here
 * instead of hardcoding their own lists (the historical drift between
 * "registrar" and "group_leader" copies is what this module exists to end).
 *
 * The database mirror lives in admin_platform_roles, seeded by
 * supabase/migrations/20260817_rbac_permission_catalog.sql. Keep the two in
 * sync when adding roles.
 */

export const SUPER_ADMIN_ROLE = "super_admin" as const;

export const ADMIN_ROLES = [
  "super_admin",
  "admin",
  "registrar",
  "content_manager",
  "moderator",
  "support_agent",
  "finance_admin",
  "compliance_officer",
  "analyst",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminRole(role: unknown): role is AdminRole {
  return typeof role === "string" && (ADMIN_ROLES as readonly string[]).includes(role);
}
