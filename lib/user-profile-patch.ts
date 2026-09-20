/**
 * What a signed-in user may change on their OWN `user_profiles` row through
 * `PATCH /api/user/profile`.
 *
 * ── Why this exists (PLAN.md P0-01) ─────────────────────────────────────
 *
 * The route writes with the service-role client, and the database guard
 * `prevent_role_escalation()` lets every service-role write through. Before
 * this allow-list the route passed the request body straight into
 * `.update()`, so any logged-in user could send `{"role":"super_admin"}` or
 * `{"user_type":"business_provider"}` and it was saved.
 *
 * ── How to extend it ────────────────────────────────────────────────────
 *
 * Add a column to EDITABLE_PROFILE_FIELDS only if it is the user's own
 * preference or personal detail AND the app needs to write it through this
 * route. Anything that grants access, money, status or identity stays out —
 * those are written by admin routes or database functions. Unknown keys are
 * rejected, so a typo or a new column fails loudly instead of silently
 * becoming writable.
 *
 * This route is in the mobile contract (tests/contract/mobile-contract.ts).
 * Tightening what it accepts is allowed; every field the shipped app sends
 * (EditUserInfoForm, NotificationPreferences, FitnessOnboarding,
 * Business/Security) is either editable or silently ignored below.
 */

type FieldKind = "string" | "nullable-string" | "boolean" | "timestamp";

/** Columns a user may edit on their own profile, and the JSON type each accepts. */
export const EDITABLE_PROFILE_FIELDS: Readonly<Record<string, FieldKind>> = {
  // Personal details (My Account → Edit profile)
  first_name: "string",
  last_name: "string",
  sex: "nullable-string",
  dob: "nullable-string",
  timezone: "nullable-string",
  region: "nullable-string",
  nhis_number: "nullable-string",

  // Onboarding + prompts
  has_completed_fitness_onboarding: "boolean",
  medical_disclaimer_acknowledged_at: "timestamp",
  last_review_prompt_at: "timestamp",

  // Notification + consent preferences
  push_notifications_enabled: "boolean",
  push_workouts_enabled: "boolean",
  push_medication_enabled: "boolean",
  push_chats_enabled: "boolean",
  push_promotions_enabled: "boolean",
  whatsapp_opt_in: "boolean",
  marketing_consent: "boolean",
  research_consent: "boolean",

  // Legacy single-token column; register_push_token is the real path.
  expo_push_token: "nullable-string",
};

/** Sent by current app builds but never written here — dropped without error. */
export const IGNORED_PROFILE_FIELDS: ReadonlySet<string> = new Set([
  "user_id", // identity comes from the verified token, never the body
  "avatar_url", // written by /api/user/avatar after the storage upload
  "email", // lives on auth.users, not user_profiles
]);

/**
 * Columns that exist but are owned by admins or the system. Named explicitly
 * so the 400 says "can't be changed" rather than "unknown field".
 */
export const PROTECTED_PROFILE_FIELDS: ReadonlySet<string> = new Set([
  "role",
  "user_type",
  "account_types",
  "status",
  "is_admin",
  "admin_role",
  "admin_permissions",
  "public_id",
  "deleted_at",
  "created_at",
  "updated_at",
  "last_active",
  "last_login_at",
  "login_attempts",
  "locked_until",
  "mfa_enabled",
  "mfa_verified_at",
  "whitelisted_ips",
  "notes",
  "fitcoins_balance",
  "lifetime_fitcoins_earned",
  "department",
  "location",
  "whatsapp_opt_in_at", // stamped by the server when whatsapp_opt_in changes
  "is_flagged",
  "flag_reason",
  "flagged_at",
  "flagged_by",
]);

export type ProfilePatchResult =
  | {
      ok: true;
      /** Columns to write, already validated. May be empty (e.g. only ignored keys). */
      fields: Record<string, unknown>;
      /**
       * Present when the body carried `phone_number`. The route must compare
       * it with the stored number: an unchanged value is fine (the edit form
       * always sends it), a changed one must go through OTP verification.
       */
      phoneNumber?: string | null;
    }
  | { ok: false; error: string; field?: string };

function matchesKind(value: unknown, kind: FieldKind): boolean {
  switch (kind) {
    case "string":
      return typeof value === "string";
    case "nullable-string":
      return value === null || typeof value === "string";
    case "boolean":
      return typeof value === "boolean";
    case "timestamp":
      return (
        value === null ||
        (typeof value === "string" && !Number.isNaN(Date.parse(value)))
      );
  }
}

const KIND_LABEL: Record<FieldKind, string> = {
  string: "text",
  "nullable-string": "text or null",
  boolean: "true or false",
  timestamp: "an ISO date-time or null",
};

/**
 * Validate a PATCH body against the allow-list. Pure: no I/O, so it is unit
 * tested directly (tests/unit/user-profile-patch.test.ts).
 */
export function sanitizeProfilePatch(
  body: unknown,
  now: () => Date = () => new Date(),
): ProfilePatchResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid request body" };
  }

  const fields: Record<string, unknown> = {};
  let phoneNumber: string | null | undefined;

  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (IGNORED_PROFILE_FIELDS.has(key)) continue;

    if (key === "phone_number") {
      if (value !== null && typeof value !== "string") {
        return { ok: false, field: key, error: "phone_number must be text or null" };
      }
      phoneNumber = value;
      continue;
    }

    if (key === "requires_password_change") {
      // The app clears its own flag after the user sets a new password
      // (Business/Security.tsx). Setting it back to true is an admin action.
      if (value !== false) {
        return {
          ok: false,
          field: key,
          error: "requires_password_change can only be cleared (false) here",
        };
      }
      fields[key] = false;
      continue;
    }

    if (PROTECTED_PROFILE_FIELDS.has(key)) {
      return { ok: false, field: key, error: `${key} can't be changed here` };
    }

    const kind = EDITABLE_PROFILE_FIELDS[key];
    if (!kind) {
      return { ok: false, field: key, error: `Unknown field: ${key}` };
    }
    if (!matchesKind(value, kind)) {
      return { ok: false, field: key, error: `${key} must be ${KIND_LABEL[kind]}` };
    }

    fields[key] = typeof value === "string" ? value.trim() : value;
  }

  if (typeof fields.whatsapp_opt_in === "boolean") {
    fields.whatsapp_opt_in_at = fields.whatsapp_opt_in ? now().toISOString() : null;
  }

  return phoneNumber === undefined
    ? { ok: true, fields }
    : { ok: true, fields, phoneNumber };
}

/** Phone numbers are compared ignoring spaces, so "024 555 0142" equals "0245550142". */
export function samePhoneNumber(a: string | null | undefined, b: string | null | undefined): boolean {
  const norm = (v: string | null | undefined) => (v ?? "").replace(/\s+/g, "");
  return norm(a) === norm(b);
}
