import { getAdminClient } from "@/lib/db/admin";

/**
 * Shared helpers for the /api/period/data handlers: HTML safety, slugs, name
 * masking, audit writes, profile lookup and in-memory paging.
 */
export const unsafeHtml = (value: string) => /<\s*(script|iframe|object|embed)|javascript\s*:|\bon\w+\s*=/i.test(value);
export const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);

export const maskName = (first?: string | null, last?: string | null) => {
  const mask = (value?: string | null) => value ? `${value.slice(0, 1)}${"•".repeat(Math.min(4, Math.max(1, value.length - 1)))}` : "";
  return [mask(first), mask(last)].filter(Boolean).join(" ") || "Anonymous user";
};

export async function writeAudit(actorId: string, action: string, resourceType: string, resourceId?: string, metadata: Record<string, unknown> = {}) {
  const admin = getAdminClient();
  const { error } = await admin.from("admin_activity_logs").insert({
    actor_id: actorId,
    action,
    resource_type: resourceType,
    resource_id: resourceId ?? null,
    metadata,
  });
  if (error) console.error("[period/audit]", error.message);
}

export function profileMaps(profiles: Array<Record<string, any>>) {
  return new Map(profiles.map((profile) => [profile.user_id, profile]));
}

export async function loadProfiles(admin: ReturnType<typeof getAdminClient>, userIds: string[]) {
  if (!userIds.length) return [];
  // region lives on period_user_settings (period-tracker-specific), not
  // user_profiles -- there's no user-level region anywhere else on the
  // platform to join against instead.
  const [{ data: profiles, error: profilesError }, { data: settings }] = await Promise.all([
    admin.from("user_profiles").select("user_id,first_name,last_name").in("user_id", userIds),
    admin.from("period_user_settings").select("user_id,region").in("user_id", userIds),
  ]);
  if (profilesError) {
    console.error("[period/loadProfiles] user_profiles error:", profilesError.message);
    return [];
  }
  const regionByUser = new Map((settings ?? []).map((row) => [row.user_id, row.region]));
  return (profiles ?? []).map((profile) => ({ ...profile, region: regionByUser.get(profile.user_id) ?? null }));
}

export function pageRows<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length;
  return {
    data: rows.slice((page - 1) * pageSize, page * pageSize),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}
