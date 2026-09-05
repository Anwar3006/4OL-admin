/**
 * @deprecated Import `getAdminClient` from `@/lib/db/admin` instead.
 *
 * Kept as a re-export so the cleanup could land without touching every API
 * route. Behaviour is unchanged: still a factory, still throws when the
 * service key is missing, and now also throws if pulled into a browser
 * bundle. Remove once `rg "lib/supabase-admin"` comes back empty.
 */
export { getAdminClient as getSupabaseAdmin } from "@/lib/db/admin";
