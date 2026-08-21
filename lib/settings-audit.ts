import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Settings change audit trail (Gap Analysis Part P, enhancement 5).
 * Every settings mutation records who changed what — feeds the Audit Log
 * view and Admins → Activity Logs. Never throws: an audit-log failure must
 * not roll back the user-facing mutation it documents.
 */
export async function logSettingsChange(
  admin: SupabaseClient,
  changedBy: string,
  settingArea:
    | "platform"
    | "security"
    | "api_keys"
    | "billing"
    | "compliance"
    | "maintenance"
    | "feature_flags"
    | "integrations",
  settingKey: string,
  previousValue: unknown,
  newValue: unknown,
): Promise<void> {
  const { error } = await admin.from("settings_change_log").insert({
    changed_by: changedBy,
    setting_area: settingArea,
    setting_key: settingKey,
    previous_value: previousValue === undefined ? null : previousValue,
    new_value: newValue === undefined ? null : newValue,
  });

  if (error) {
    // settings_change_log ships with the 20260820 migration; until it is
    // applied the mutation itself still succeeds.
    console.warn("[settings-audit] failed to record change:", error.message);
  }
}
