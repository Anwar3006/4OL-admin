import { createClient } from "@supabase/supabase-js";
import { describe, expect, test } from "vitest";

import { ADMIN_ROLES, SUPER_ADMIN_ROLE } from "@/lib/admin-roles";
import { ROLE_DEFAULTS } from "@/lib/permissions";

/**
 * Epic 3.2: lib/permissions.ts's ROLE_DEFAULTS is a static mirror of the
 * live admin_role_permissions table — PermissionsProvider and
 * requireAdminApiUser both read the live table in normal operation, and
 * only fall back to this mirror if the RBAC migration is missing entirely
 * (isRbacMigrationMissing). A drift between the two means: today's live
 * behavior is internally consistent, but a fresh/rolled-back environment
 * would silently grant a different permission set than production has.
 *
 * This caught a real drift once already: analyst was missing 4 keys in the
 * live table relative to its own documented definition in ROLE_DEFAULTS
 * (fixed in 20260908_epic3_2_analyst_permission_drift.sql). This test keeps
 * the two in sync going forward.
 *
 * Skips when database credentials are absent, same pattern as
 * rpc-signatures.test.ts.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SERVICE_KEY;

const hasCredentials = Boolean(url && serviceKey);

const NON_SUPER_ADMIN_ROLES = ADMIN_ROLES.filter((role) => role !== SUPER_ADMIN_ROLE);

describe.skipIf(!hasCredentials)("RBAC permission catalog matches ROLE_DEFAULTS", () => {
  test("every role's live admin_role_permissions set equals its ROLE_DEFAULTS mirror", async () => {
    const admin = createClient(url!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin
      .from("admin_role_permissions")
      .select("role, permission_key")
      .in("role", NON_SUPER_ADMIN_ROLES);

    expect(error, "Could not read admin_role_permissions.").toBeNull();

    const liveByRole = new Map<string, Set<string>>();
    for (const row of data ?? []) {
      const set = liveByRole.get(row.role) ?? new Set<string>();
      set.add(row.permission_key);
      liveByRole.set(row.role, set);
    }

    for (const role of NON_SUPER_ADMIN_ROLES) {
      const live = [...(liveByRole.get(role) ?? new Set<string>())].sort();
      const expected = [...ROLE_DEFAULTS[role]].sort();
      expect(
        live,
        `Role "${role}" drifted: live admin_role_permissions vs. ` +
          `ROLE_DEFAULTS["${role}"] in lib/permissions.ts.\n` +
          `  live:     ${JSON.stringify(live)}\n` +
          `  expected: ${JSON.stringify(expected)}`,
      ).toEqual(expected);
    }
  }, 30_000);
});
