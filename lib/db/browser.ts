import { createBrowserClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Supabase client for Client Components and hooks.
 *
 * Stores the session in COOKIES, so Server Components, Server Actions and
 * middleware see the same session. Requests run as the signed-in admin and
 * are subject to row-level security — see ./README.md for what that means
 * for RLS-locked tables.
 */
export function getBrowserClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
