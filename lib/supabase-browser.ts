/**
 * @deprecated Import `getBrowserClient` from `@/lib/db/browser` instead.
 *
 * Kept as a re-export so the cleanup could land without touching every
 * caller. Behaviour is unchanged — this was always the cookie-backed browser
 * client. Remove once `rg "lib/supabase-browser"` comes back empty.
 */
export { getBrowserClient as getSupabaseBrowserClient } from "@/lib/db/browser";
