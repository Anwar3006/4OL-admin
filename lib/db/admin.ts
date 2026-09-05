import "server-only";

import { createClient } from "@supabase/supabase-js";

import { supabaseServiceKey, supabaseUrl } from "./env";

/**
 * Supabase client running as the service role. **Bypasses every RLS policy.**
 *
 * Only for API routes under `app/api/**`, and only after the route has
 * authorised the caller with `requireAdminApiUser(permission)`.
 *
 * See ./README.md for when service role is the correct choice — in short:
 * anything an admin writes, and any table whose RLS makes it invisible to the
 * browser client.
 *
 * ── Two deliberate choices ─────────────────────────────────────────────
 *
 * 1. This is a FACTORY, not a module-scope singleton. The module it replaces
 *    (`lib/supabase/indexAdmin.ts`) constructed a service-role client as an
 *    import side effect, which meant merely importing the file — from
 *    anywhere, including by accident from a client component — built a client
 *    holding the service key.
 *
 * 2. The guard is two-layered, and neither layer is a permission slip.
 *
 *    `import "server-only"` (first line, zero dependencies) is the real one:
 *    if any module reachable from a client component imports this file, the
 *    BUILD fails and names the offending file. That is the failure you want —
 *    it happens on your machine, not on a user's.
 *
 *    The `typeof window` throw below is the backstop for the paths the
 *    bundler does not police: a runtime `require`, a test harness with a DOM
 *    environment, or a future bundler that resolves the `browser` condition
 *    differently. Keep both. They fail at different times, which is the
 *    point.
 */
if (typeof window !== "undefined") {
  throw new Error(
    "lib/db/admin.ts was imported into a browser bundle. This module holds " +
      "the Supabase service-role key and must only be used from server code " +
      "under app/api/**. Use lib/db/browser.ts instead.",
  );
}

export function getAdminClient() {
  return createClient(supabaseUrl(), supabaseServiceKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
