import { createClient } from "@supabase/supabase-js";

import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * A Supabase client whose session is deliberately NOT the app's session.
 *
 * There is exactly one caller and it should stay that way: the public
 * `/delete-account` page, which signs a user in, writes their deletion
 * request, and signs them out again — a self-contained transaction that must
 * not touch whoever is signed into this browser.
 *
 * `getBrowserClient()` is cookie-backed, and cookies are where the admin panel
 * keeps its session. Running that flow through it would mean a visitor's
 * `signInWithPassword` REPLACES the signed-in admin's session, and the
 * `signOut` at the end logs the admin out. Isolation is the point here, not an
 * oversight.
 *
 * This is not a general-purpose escape hatch. It holds its session in
 * localStorage, so it is `anon` until something signs in on it, and any read of
 * an RLS-protected table through it comes back EMPTY rather than erroring —
 * the failure mode described in ./README.md. If you are reaching for this to
 * read data, you want `getBrowserClient()` or an API route instead.
 *
 * It replaces `app/utils/supabaseClient.js`, an undocumented fourth client
 * that six files had drifted onto; the other five were dead, broken, or
 * switched to the canonical clients.
 */
export function getIsolatedAuthClient() {
  return createClient(supabaseUrl(), supabaseAnonKey());
}
