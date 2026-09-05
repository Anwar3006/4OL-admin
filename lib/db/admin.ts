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
 * 2. The browser guard below is a backstop, not a permission slip. It throws
 *    at runtime if this module is ever evaluated in a browser bundle.
 *
 *    A build-time failure would be better than a runtime one. Installing the
 *    zero-dependency `server-only` package and adding `import "server-only";`
 *    as the first line of this file turns any client import into a build
 *    error naming the offending file. Worth doing; left out here only to
 *    avoid adding a dependency inside a cleanup branch.
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
