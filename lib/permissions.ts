/**
 * Permission catalog — application-side mirror of the admin_permissions /
 * admin_role_permissions tables seeded in
 * supabase/migrations/20260817_rbac_permission_catalog.sql.
 *
 * The DATABASE is authoritative at runtime; this module exists so that:
 *   - navigation/UI can declare required permissions statically,
 *   - the Roles & Permissions matrix editor can render without a DB round-trip
 *     for the catalog itself,
 *   - unit tests can exercise the resolution logic with zero I/O.
 *
 * Keep both in sync when adding permissions.
 */

import { SUPER_ADMIN_ROLE, type AdminRole } from "@/lib/admin-roles";

export interface PermissionDef {
  key: string;
  resource: string;
  action: string;
  description: string;
}

const p = (resource: string, action: string, description: string): PermissionDef => ({
  key: `${resource}.${action}`,
  resource,
  action,
  description,
});

export const PERMISSION_CATALOG: PermissionDef[] = [
  p("dashboard", "view", "View platform dashboards and analytics"),
  p("dashboard", "export", "Export dashboard data"),
  p("admins", "view", "View admin accounts and session telemetry"),
  p("admins", "manage", "Invite, suspend, promote or remove admins"),
  p("roles", "view", "View the role/permission matrix"),
  p("roles", "edit", "Change role permission defaults and per-user overrides"),
  p("users", "view", "View user profiles"),
  p("users", "edit", "Edit, suspend or flag users"),
  p("users", "export", "Export user data"),
  p("tasks", "view", "View internal admin tasks"),
  p("tasks", "edit", "Create, update or complete admin tasks"),
  p("facilities", "view", "View facility profiles"),
  p("facilities", "create", "Register new facilities"),
  p("facilities", "edit", "Edit facility profiles"),
  p("facilities", "delete", "Delete facility profiles"),
  p("facilities", "approve", "Approve or reject pending facilities"),
  p("facilities", "feature", "Set top-rated rankings and featured placements"),
  p("reviews", "view", "View facility reviews and ratings"),
  p("reviews", "moderate", "Publish, reject or moderate reviews"),
  p("diseases", "view", "View diseases and conditions content"),
  p("diseases", "create", "Add diseases and conditions"),
  p("diseases", "edit", "Edit diseases and conditions"),
  p("diseases", "delete", "Delete diseases and conditions"),
  p("diseases", "feature", "Feature conditions on the carousel"),
  p("diseases", "export", "Export the conditions registry"),
  p("symptoms", "view", "View symptoms content"),
  p("symptoms", "create", "Add symptoms"),
  p("symptoms", "edit", "Edit symptoms"),
  p("symptoms", "delete", "Delete symptoms"),
  p("symptoms", "feature", "Feature symptoms on the home carousel"),
  p("anatomy", "view", "View anatomy content"),
  p("anatomy", "edit", "Edit anatomy content"),
  p("healthyliving", "view", "View healthy living articles"),
  p("healthyliving", "create", "Add healthy living articles"),
  p("healthyliving", "edit", "Edit healthy living articles"),
  p("healthyliving", "delete", "Delete healthy living articles"),
  p("healthyliving", "feature", "Feature healthy living articles on the home carousel"),
  p("faq", "view", "View FAQs"),
  p("faq", "create", "Add FAQs"),
  p("faq", "edit", "Edit FAQs"),
  p("faq", "delete", "Delete FAQs"),
  p("fitness", "view", "View fitness library"),
  p("fitness", "create", "Add exercises, plans and challenges"),
  p("fitness", "edit", "Edit fitness content"),
  p("fitness", "delete", "Delete fitness content"),
  p("period", "view", "View privacy-minimized Period Tracker records"),
  p("period", "edit", "Correct Period Tracker records"),
  p("period", "review_notes", "Review explicitly flagged period notes"),
  p("period", "content", "Manage Period Library content"),
  p("medication", "view", "View medication reminder data"),
  p("medication", "edit", "Manage medication database entries"),
  p("hcp", "view", "View healthcare professional records"),
  p("hcp", "create", "Onboard new healthcare professionals"),
  p("hcp", "verify", "Approve or reject HCP verifications"),
  p("jobs", "view", "View job listings and applications"),
  p("jobs", "manage", "Post, edit or remove job listings"),
  p("ibp", "view", "View IBP business listings"),
  p("ibp", "edit", "Manage IBP business listings"),
  p("ibp", "delete", "Permanently remove IBP business listings"),
  p("bedtracker", "view", "View BedTracker data"),
  p("bedtracker", "manage", "Manage beds, wards and dispatches"),
  p("facilityscout", "view", "View FacilityScout submissions"),
  p("facilityscout", "review", "Review submissions and release rewards"),
  p("chats", "view", "View conversations and support tickets"),
  p("chats", "reply", "Reply to conversations and tickets"),
  p("chats", "moderate", "Moderate flagged messages and groups"),
  p("marketing", "view", "View campaigns, discounts and subscriptions"),
  p("marketing", "create", "Create campaigns and discounts"),
  p("marketing", "edit", "Edit campaigns and discounts"),
  p("marketing", "delete", "Delete campaigns and discounts"),
  p("notifications", "view", "View notification campaigns and templates"),
  p("notifications", "create", "Create and schedule notification campaigns"),
  p("notifications", "edit", "Edit notification campaigns"),
  p("notifications", "delete", "Delete notification campaigns"),
  p("notifications", "export", "Export the notification log"),
  p("transactions", "view", "View transactions and revenue analytics"),
  p("transactions", "manage", "Process refunds and manage charges"),
  p("transactions", "export", "Export financial reports"),
  p("transactions", "expenses", "Manage operational expenses and P&L (super admin only)"),
  p("transactions", "rates", "Edit service charge rates (super admin only)"),
  p("ai", "view", "View AI models, moderation queues and usage analytics"),
  p("ai", "manage", "Configure AI models and moderation settings"),
  p("whatsapp", "view", "View WhatsApp community groups and broadcasts"),
  p("whatsapp", "broadcast", "Queue WhatsApp broadcasts"),
  p("settings", "view", "View platform settings"),
  p("settings", "manage", "Edit general platform settings and feature flags"),
  p("settings", "security", "Change security settings, maintenance mode and API keys"),
  p("settings", "billing", "Manage billing, plans and GRA tax settings"),
  p("devops", "view", "View infrastructure, CI/CD, rate-limiting and caching telemetry"),
  p("schematic", "view", "View the platform schematic and service health map"),
  p("deleteaccount", "view", "View delete-account requests"),
  p("deleteaccount", "approve", "Approve or reject delete-account requests"),
  p("deleteaccount", "export", "Export the delete-account request log"),
  p("security", "view", "View security center and audit logs"),
  p("security", "settings", "Change platform security settings"),
  p("map", "export", "Export map, footprint and coverage data"),
  p("integrations", "keys", "Manage external integration credentials"),
  p("engagement", "view", "View content engagement analytics"),
  p("subscriptions", "view", "View subscription tiers and entitlements"),
  p("subscriptions", "manage", "Grant or revoke premium/lifetime subscriptions"),
  p("fitcoins", "view", "View FitCoins tiers, rewards and ledger"),
  p("fitcoins", "manage", "Edit FitCoins reward tiers and redemption catalog"),
  p("fitness_notifications", "send", "Send fitness alerts (streak, challenge, billing) to users"),
];

export const PERMISSION_KEYS = PERMISSION_CATALOG.map((def) => def.key);

const D = (keys: string[]) => keys;

/**
 * Default permission sets per role, mirroring the SQL seed. super_admin has
 * no entry: it bypasses the catalog entirely.
 */
export const ROLE_DEFAULTS: Record<Exclude<AdminRole, "super_admin">, string[]> = {
  admin: D([
    "dashboard.view", "dashboard.export",
    "admins.view", "users.view", "users.edit", "users.export", "tasks.view", "tasks.edit",
    "facilities.view", "facilities.create", "facilities.edit", "facilities.delete", "facilities.approve",
    "reviews.view", "reviews.moderate",
    "diseases.view", "diseases.create", "diseases.edit", "diseases.delete", "diseases.feature", "diseases.export",
    "symptoms.view", "symptoms.create", "symptoms.edit", "symptoms.delete", "symptoms.feature",
    "anatomy.view", "anatomy.edit",
    "healthyliving.view", "healthyliving.create", "healthyliving.edit", "healthyliving.delete", "healthyliving.feature",
    "faq.view", "faq.create", "faq.edit", "faq.delete",
    "fitness.view", "fitness.create", "fitness.edit", "fitness.delete",
    "period.view", "period.edit", "period.review_notes", "period.content",
    "medication.view", "medication.edit",
    "hcp.view", "hcp.create", "hcp.verify",
    "jobs.view", "jobs.manage",
    "ibp.view", "ibp.edit", "ibp.delete",
    "ai.view", "ai.manage",
    "bedtracker.view", "bedtracker.manage",
    "facilityscout.view", "facilityscout.review",
    "chats.view", "chats.reply", "chats.moderate",
    "marketing.view", "marketing.create", "marketing.edit", "marketing.delete",
    "notifications.view", "notifications.create", "notifications.edit", "notifications.delete", "notifications.export",
    "transactions.view",
    "deleteaccount.view", "deleteaccount.export",
    "security.view",
    "settings.view", "settings.manage",
    "whatsapp.view",
    "map.export",
    "engagement.view",
    "subscriptions.view", "subscriptions.manage",
    "fitcoins.view", "fitcoins.manage",
    "fitness_notifications.send",
  ]),
  registrar: D([
    "dashboard.view",
    "users.view",
    "facilities.view", "facilities.create", "facilities.edit",
    "bedtracker.view", "facilityscout.view", "facilityscout.review",
    "ibp.view",
    "tasks.view",
  ]),
  content_manager: D([
    "dashboard.view",
    "diseases.view", "diseases.create", "diseases.edit", "diseases.delete", "diseases.feature", "diseases.export",
    "symptoms.view", "symptoms.create", "symptoms.edit", "symptoms.delete", "symptoms.feature",
    "anatomy.view", "anatomy.edit",
    "healthyliving.view", "healthyliving.create", "healthyliving.edit", "healthyliving.delete", "healthyliving.feature",
    "faq.view", "faq.create", "faq.edit", "faq.delete",
    "fitness.view", "fitness.create", "fitness.edit", "fitness.delete",
    "period.view", "period.content",
    "medication.view",
    "engagement.view",
    "fitcoins.view",
    "fitness_notifications.send",
  ]),
  moderator: D([
    "dashboard.view",
    "users.view",
    "reviews.view", "reviews.moderate",
    "chats.view", "chats.moderate",
    "ai.view",
    "period.view", "period.review_notes",
  ]),
  support_agent: D([
    "dashboard.view",
    "users.view",
    "chats.view", "chats.reply",
    "faq.view",
  ]),
  finance_admin: D([
    "dashboard.view", "dashboard.export",
    "users.view",
    "transactions.view", "transactions.manage", "transactions.export",
    "marketing.view",
    "subscriptions.view",
    "fitcoins.view",
  ]),
  compliance_officer: D([
    "dashboard.view",
    "users.view",
    "hcp.view", "hcp.verify",
    "deleteaccount.view", "deleteaccount.approve", "deleteaccount.export",
    "period.view",
    "security.view",
  ]),
  analyst: D(
    PERMISSION_CATALOG
      .filter((def) => def.action === "view")
      .map((def) => def.key)
      .filter((key) => !["admins.view", "roles.view", "security.view", "settings.view", "devops.view", "whatsapp.view", "schematic.view"].includes(key)),
  ),
  // O12: mockup role table's "AI Manager" — scoped exactly to the AI Hub
  // (models, moderation, recommendations, analytics).
  ai_manager: D([
    "dashboard.view",
    "ai.view", "ai.manage",
  ]),
};

export interface PermissionOverride {
  permission_key: string;
  effect: "grant" | "revoke";
}

export interface PermissionSubject {
  role: string;
  /** Effective role defaults; when omitted, ROLE_DEFAULTS is consulted. */
  rolePermissions?: string[];
  overrides?: PermissionOverride[];
}

/**
 * Pure permission resolution, identical semantics to
 * public.has_4ol_permission():
 *   1. super_admin passes everything;
 *   2. otherwise: (role defaults ∪ explicit grants) minus explicit revokes;
 *   3. deny by default for unknown roles.
 */
export function hasPermission(subject: PermissionSubject, key: string): boolean {
  if (subject.role === SUPER_ADMIN_ROLE) return true;

  const revoked = new Set(
    (subject.overrides ?? [])
      .filter((o) => o.effect === "revoke")
      .map((o) => o.permission_key),
  );
  if (revoked.has(key)) return false;

  const granted = new Set(
    (subject.overrides ?? [])
      .filter((o) => o.effect === "grant")
      .map((o) => o.permission_key),
  );
  if (granted.has(key)) return true;

  const defaults =
    subject.rolePermissions ??
    ROLE_DEFAULTS[subject.role as Exclude<AdminRole, "super_admin">] ??
    [];
  return defaults.includes(key);
}

export function isValidPermissionKey(key: string): boolean {
  return PERMISSION_KEYS.includes(key);
}

/**
 * True only when a Supabase/Postgres error means the RBAC migration
 * (20260817_rbac_permission_catalog.sql) hasn't been applied yet — the one
 * case where degrading to the static ROLE_DEFAULTS mirror is safe. Any other
 * error (timeout, dropped connection, transient DB issue) must fail closed:
 * the mirror has no concept of DB-side per-user overrides, so silently
 * falling back to it on an arbitrary error could re-grant a permission that
 * was explicitly revoked in the database.
 */
export function isRbacMigrationMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  // 42883 = undefined_function, 42P01 = undefined_table (Postgres error codes)
  if (error.code === "42883" || error.code === "42P01") return true;
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("could not find the function") || message.includes("does not exist");
}
