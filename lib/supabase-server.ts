/**
 * @deprecated Import `getServerClient` from `@/lib/db/server` instead.
 *
 * Kept as a re-export so the cleanup could land without touching every
 * caller. Behaviour is unchanged. Remove once
 * `rg "lib/supabase-server"` comes back empty.
 */
export { getServerClient as getSupabaseServerClient } from "@/lib/db/server";
