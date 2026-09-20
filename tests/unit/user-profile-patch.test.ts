import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  EDITABLE_PROFILE_FIELDS,
  PROTECTED_PROFILE_FIELDS,
  samePhoneNumber,
  sanitizeProfilePatch,
} from "@/lib/user-profile-patch";

// ── The pure allow-list ────────────────────────────────────────────────────

describe("sanitizeProfilePatch", () => {
  it.each([
    ["role", "super_admin"],
    ["role", "admin"],
    ["user_type", "business_provider"],
    ["account_types", ["member", "provider"]],
    ["status", "active"],
    ["admin_role", "super_admin"],
    ["is_admin", true],
    ["fitcoins_balance", 999999],
    ["public_id", "4OL-000001"],
    ["whatsapp_opt_in_at", "2026-09-20T10:00:00Z"],
  ])("rejects the protected field %s", (field, value) => {
    const result = sanitizeProfilePatch({ first_name: "Ama", [field]: value });
    expect(result).toEqual({ ok: false, field, error: `${field} can't be changed here` });
  });

  it("rejects unknown fields instead of passing them to Postgres", () => {
    expect(sanitizeProfilePatch({ favourite_colour: "green" })).toEqual({
      ok: false,
      field: "favourite_colour",
      error: "Unknown field: favourite_colour",
    });
  });

  it("accepts exactly what EditUserInfoForm sends, ignoring user_id", () => {
    const result = sanitizeProfilePatch({
      first_name: " Ama ",
      last_name: "Sarpong",
      dob: "1997-03-14",
      sex: "female",
      phone_number: "024 555 0142",
      user_id: "someone-else",
    });
    expect(result).toEqual({
      ok: true,
      fields: { first_name: "Ama", last_name: "Sarpong", dob: "1997-03-14", sex: "female" },
      phoneNumber: "024 555 0142",
    });
  });

  it("accepts what FitnessOnboarding and NotificationPreferences send", () => {
    const result = sanitizeProfilePatch({
      has_completed_fitness_onboarding: true,
      push_notifications_enabled: true,
      push_workouts_enabled: false,
      push_medication_enabled: true,
      push_chats_enabled: true,
    });
    expect(result.ok).toBe(true);
  });

  it("silently drops avatar_url and email", () => {
    expect(sanitizeProfilePatch({ avatar_url: "x", email: "a@b.c" })).toEqual({
      ok: true,
      fields: {},
    });
  });

  it("lets a user clear requires_password_change but never set it", () => {
    expect(sanitizeProfilePatch({ requires_password_change: false })).toEqual({
      ok: true,
      fields: { requires_password_change: false },
    });
    expect(sanitizeProfilePatch({ requires_password_change: true })).toMatchObject({
      ok: false,
      field: "requires_password_change",
    });
  });

  it("type-checks values", () => {
    expect(sanitizeProfilePatch({ push_chats_enabled: "yes" })).toMatchObject({
      ok: false,
      field: "push_chats_enabled",
    });
    expect(sanitizeProfilePatch({ first_name: null })).toMatchObject({
      ok: false,
      field: "first_name",
    });
    expect(sanitizeProfilePatch({ last_review_prompt_at: "not a date" })).toMatchObject({
      ok: false,
      field: "last_review_prompt_at",
    });
  });

  it("stamps whatsapp_opt_in_at on the server", () => {
    const now = () => new Date("2026-09-20T09:30:00.000Z");
    expect(sanitizeProfilePatch({ whatsapp_opt_in: true }, now)).toEqual({
      ok: true,
      fields: { whatsapp_opt_in: true, whatsapp_opt_in_at: "2026-09-20T09:30:00.000Z" },
    });
    expect(sanitizeProfilePatch({ whatsapp_opt_in: false }, now)).toEqual({
      ok: true,
      fields: { whatsapp_opt_in: false, whatsapp_opt_in_at: null },
    });
  });

  it("rejects non-object bodies", () => {
    for (const body of [null, "role=super_admin", 42, ["role"]]) {
      expect(sanitizeProfilePatch(body)).toEqual({ ok: false, error: "Invalid request body" });
    }
  });

  it("never lists a field as both editable and protected", () => {
    for (const field of Object.keys(EDITABLE_PROFILE_FIELDS)) {
      expect(PROTECTED_PROFILE_FIELDS.has(field)).toBe(false);
    }
  });
});

describe("samePhoneNumber", () => {
  it("ignores whitespace only", () => {
    expect(samePhoneNumber("024 555 0142", "0245550142")).toBe(true);
    expect(samePhoneNumber("0245550142", "0245550143")).toBe(false);
    expect(samePhoneNumber(null, "")).toBe(true);
  });
});

// ── The route: a rejected body must not reach the database ─────────────────

const { getRequestUser, from, update, select } = vi.hoisted(() => {
  const update = vi.fn();
  const select = vi.fn();
  const from = vi.fn();
  return { getRequestUser: vi.fn(), from, update, select };
});

vi.mock("@/lib/mobile-auth", () => ({
  getRequestUser,
  lastAuthTiming: { ms: 1, path: "local" },
}));

vi.mock("@/lib/db/admin", () => ({
  getAdminClient: () => ({ from }),
}));

function chain(result: { data: unknown; error: unknown }) {
  // .update(x).eq().select().maybeSingle()  and  .select(x).eq().maybeSingle()
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const afterEq = { select: vi.fn(() => ({ maybeSingle })), maybeSingle };
  const eq = vi.fn(() => afterEq);
  update.mockImplementation(() => ({ eq }));
  select.mockImplementation(() => ({ eq }));
  from.mockImplementation(() => ({ update, select }));
}

function patchRequest(body: unknown) {
  return new Request("https://office.4ourlife.com/api/user/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer t" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/user/profile", () => {
  beforeEach(() => {
    getRequestUser.mockReset().mockResolvedValue({ id: "user-1", user_metadata: {} });
    from.mockReset();
    update.mockReset();
    select.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns 400 for role: super_admin and never writes", async () => {
    chain({ data: { user_id: "user-1" }, error: null });
    const { PATCH } = await import("@/app/api/user/profile/route");

    const res = await PATCH(patchRequest({ role: "super_admin" }) as never);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "role can't be changed here", field: "role" });
    expect(update).not.toHaveBeenCalled();
  });

  it("returns 400 for user_type: business_provider and never writes", async () => {
    chain({ data: null, error: null });
    const { PATCH } = await import("@/app/api/user/profile/route");

    const res = await PATCH(patchRequest({ first_name: "Ama", user_type: "business_provider" }) as never);

    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("returns 401 without a valid token", async () => {
    getRequestUser.mockResolvedValue(null);
    const { PATCH } = await import("@/app/api/user/profile/route");

    const res = await PATCH(patchRequest({ first_name: "Ama" }) as never);
    expect(res.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("writes only the allowed fields for a normal edit", async () => {
    chain({ data: { user_id: "user-1", phone_number: "0245550142", first_name: "Ama" }, error: null });
    const { PATCH } = await import("@/app/api/user/profile/route");

    const res = await PATCH(
      patchRequest({ first_name: "Ama", phone_number: "024 555 0142", user_id: "user-2" }) as never,
    );

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ first_name: "Ama" });
  });

  it("rejects a changed phone number (must use OTP verification)", async () => {
    chain({ data: { phone_number: "0245550142" }, error: null });
    const { PATCH } = await import("@/app/api/user/profile/route");

    const res = await PATCH(patchRequest({ first_name: "Ama", phone_number: "0209999999" }) as never);

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ field: "phone_number" });
    expect(update).not.toHaveBeenCalled();
  });
});
