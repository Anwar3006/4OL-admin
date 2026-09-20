import { describe, expect, test } from "vitest";
import {
  PERMISSION_CATALOG,
  PERMISSION_KEYS,
  ROLE_DEFAULTS,
  hasPermission,
  isValidPermissionKey,
} from "./permissions";
import { ADMIN_ROLES, SUPER_ADMIN_ROLE } from "./admin-roles";

describe("permission catalog integrity", () => {
  test("keys are unique and shaped resource.action", () => {
    expect(new Set(PERMISSION_KEYS).size).toBe(PERMISSION_KEYS.length);
    for (const def of PERMISSION_CATALOG) {
      expect(def.key).toBe(`${def.resource}.${def.action}`);
      // Resources allow underscores (e.g. fitness_notifications) but no
      // dots, so key = resource.action stays unambiguous.
      expect(def.resource).toMatch(/^[a-z_]+$/);
      expect(def.action).toMatch(/^[a-z_]+$/);
      expect(def.description.length).toBeGreaterThan(0);
    }
  });

  test("ROLE_DEFAULTS covers exactly the non-super roles and uses only catalog keys", () => {
    const expected = ADMIN_ROLES.filter((r) => r !== SUPER_ADMIN_ROLE);
    expect(Object.keys(ROLE_DEFAULTS).sort()).toEqual([...expected].sort());
    for (const [role, keys] of Object.entries(ROLE_DEFAULTS)) {
      expect(new Set(keys).size, `duplicates in ${role}`).toBe(keys.length);
      for (const key of keys) {
        expect(isValidPermissionKey(key), `${role}: unknown key ${key}`).toBe(true);
      }
    }
  });

  test("security-sensitive keys exist in the catalog", () => {
    for (const key of [
      "roles.edit",
      "admins.manage",
      "security.settings",
      "integrations.keys",
      "users.export",
      "notifications.delete",
    ]) {
      expect(PERMISSION_KEYS, `missing ${key}`).toContain(key);
    }
  });
});

describe("role defaults", () => {
  test("analyst is read-only: only *.view keys, minus admins/roles/security", () => {
    const analyst = ROLE_DEFAULTS.analyst;
    for (const key of analyst) {
      expect(key.endsWith(".view")).toBe(true);
    }
    expect(analyst).not.toContain("admins.view");
    expect(analyst).not.toContain("roles.view");
    expect(analyst).not.toContain("security.view");
    expect(analyst).toContain("users.view");
    expect(analyst).toContain("transactions.view");
  });

  test("registrar gets data-entry but not user mutations or finance", () => {
    // registrar's facility create/edit power is enforced at the RPC layer
    // (register_facility_with_profile, registrar_update_own_facility), not a
    // blanket facilities.create grant — narrowed in
    // 20260909_registrar_data_collector_scope.sql.
    expect(ROLE_DEFAULTS.registrar).toContain("facilityscout.assignments");
    expect(ROLE_DEFAULTS.registrar).not.toContain("facilities.create");
    expect(ROLE_DEFAULTS.registrar).not.toContain("users.edit");
    expect(ROLE_DEFAULTS.registrar).not.toContain("transactions.view");
    expect(ROLE_DEFAULTS.registrar).not.toContain("roles.edit");
  });

  test("providers.create is granted to admin and registrar only (P0-06)", () => {
    // Mirrors supabase/migrations/20260920150000_provider_invite_foundation.sql
    // — registrars register facility owners in the field and need this to
    // call registerProviderAccount(), same as admins.
    expect(PERMISSION_KEYS).toContain("providers.create");
    expect(ROLE_DEFAULTS.admin).toContain("providers.create");
    expect(ROLE_DEFAULTS.registrar).toContain("providers.create");
    for (const [role, keys] of Object.entries(ROLE_DEFAULTS)) {
      if (role === "admin" || role === "registrar") continue;
      expect(keys, `${role} should not default to providers.create`).not.toContain("providers.create");
    }
  });

  test("no non-super role gets roles.edit or admins.manage by default", () => {
    for (const [role, keys] of Object.entries(ROLE_DEFAULTS)) {
      expect(keys, `${role} must not default to roles.edit`).not.toContain("roles.edit");
      expect(keys, `${role} must not default to admins.manage`).not.toContain("admins.manage");
      expect(keys, `${role} must not default to integrations.keys`).not.toContain("integrations.keys");
    }
  });
});

describe("hasPermission resolution (mirrors has_4ol_permission SQL)", () => {
  test("super_admin bypasses every check, even unknown keys", () => {
    expect(hasPermission({ role: SUPER_ADMIN_ROLE }, "users.edit")).toBe(true);
    expect(hasPermission({ role: SUPER_ADMIN_ROLE }, "not.a.real.key")).toBe(true);
  });

  test("deny by default for unknown roles", () => {
    expect(hasPermission({ role: "user" }, "dashboard.view")).toBe(false);
    expect(hasPermission({ role: "group_leader" }, "dashboard.view")).toBe(false);
    expect(hasPermission({ role: "" }, "dashboard.view")).toBe(false);
  });

  test("role defaults are honoured", () => {
    // registrar's facility create/edit power is enforced at the RPC layer
    // (register_facility_with_profile), not a blanket facilities.create
    // grant — narrowed in 20260909_registrar_data_collector_scope.sql.
    expect(hasPermission({ role: "registrar" }, "facilityscout.assignments")).toBe(true);
    expect(hasPermission({ role: "registrar" }, "facilities.create")).toBe(false);
    expect(hasPermission({ role: "registrar" }, "users.export")).toBe(false);
    expect(hasPermission({ role: "finance_admin" }, "transactions.manage")).toBe(true);
    expect(hasPermission({ role: "finance_admin" }, "notifications.create")).toBe(false);
  });

  test("grant override adds a permission outside role defaults", () => {
    const subject = {
      role: "support_agent",
      overrides: [{ permission_key: "tasks.edit", effect: "grant" as const }],
    };
    expect(hasPermission(subject, "tasks.edit")).toBe(true);
    expect(hasPermission({ role: "support_agent" }, "tasks.edit")).toBe(false);
  });

  test("revoke override wins over role defaults", () => {
    const subject = {
      role: "admin",
      overrides: [{ permission_key: "users.export", effect: "revoke" as const }],
    };
    expect(hasPermission({ role: "admin" }, "users.export")).toBe(true);
    expect(hasPermission(subject, "users.export")).toBe(false);
  });

  test("revoke wins over grant on the same key", () => {
    const subject = {
      role: "support_agent",
      overrides: [
        { permission_key: "users.export", effect: "grant" as const },
        { permission_key: "users.export", effect: "revoke" as const },
      ],
    };
    expect(hasPermission(subject, "users.export")).toBe(false);
  });

  test("explicit rolePermissions take precedence over ROLE_DEFAULTS", () => {
    const subject = { role: "admin", rolePermissions: ["users.view"] };
    expect(hasPermission(subject, "users.view")).toBe(true);
    // admin normally has this, but the explicit list replaces defaults
    expect(hasPermission(subject, "users.edit")).toBe(false);
  });
});

describe("isValidPermissionKey", () => {
  test("accepts catalog keys only", () => {
    expect(isValidPermissionKey("dashboard.view")).toBe(true);
    expect(isValidPermissionKey("notifications.delete")).toBe(true);
    expect(isValidPermissionKey("dashboard.destroy")).toBe(false);
    expect(isValidPermissionKey("")).toBe(false);
    expect(isValidPermissionKey("no-dots")).toBe(false);
  });
});
