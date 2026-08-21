import { describe, expect, test } from "vitest";
import { ADMIN_ROLES, SUPER_ADMIN_ROLE, isAdminRole } from "./admin-roles";

describe("ADMIN_ROLES", () => {
  test("contains the 10 canonical platform roles", () => {
    expect(ADMIN_ROLES).toHaveLength(10);
    expect([...ADMIN_ROLES].sort()).toEqual(
      [
        "admin",
        "ai_manager",
        "analyst",
        "compliance_officer",
        "content_manager",
        "finance_admin",
        "moderator",
        "registrar",
        "super_admin",
        "support_agent",
      ].sort(),
    );
  });

  test("super_admin is the designated bypass role", () => {
    expect(ADMIN_ROLES).toContain(SUPER_ADMIN_ROLE);
    expect(SUPER_ADMIN_ROLE).toBe("super_admin");
  });

  test("legacy vocabulary is NOT part of the platform role list", () => {
    // group_leader is chat-scoped (conversation_members.role); registrar
    // replaced it in the platform vocabulary.
    expect(ADMIN_ROLES).not.toContain("group_leader");
    expect(ADMIN_ROLES).toContain("registrar");
    expect(ADMIN_ROLES).not.toContain("user");
  });
});

describe("isAdminRole", () => {
  test("accepts every canonical role", () => {
    for (const role of ADMIN_ROLES) {
      expect(isAdminRole(role)).toBe(true);
    }
  });

  test("rejects non-admin, legacy and malformed input", () => {
    expect(isAdminRole("user")).toBe(false);
    expect(isAdminRole("group_leader")).toBe(false);
    expect(isAdminRole("")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole(42)).toBe(false);
    expect(isAdminRole("SUPER_ADMIN")).toBe(false);
  });
});
