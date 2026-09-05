import type { SupabaseClient } from "@supabase/supabase-js";

import { getAdminClient } from "@/lib/db/admin";

/**
 * @deprecated Import `getAdminClient` from `@/lib/db/admin` and call it where
 * you need a client. Remove once `rg "supabaseAdmin"` comes back empty.
 *
 * This used to construct a service-role client at import time, so importing
 * the module — from anywhere, including by accident — built a client holding
 * the service key. The Proxy below keeps the old *shape* (a value you can
 * use directly) while deferring construction to first property access, so
 * importing this file no longer does anything.
 *
 * Behaviour change to be aware of: the old module logged a warning and built
 * a client with empty credentials when the env vars were missing, which
 * failed later with a confusing PostgREST error. This one throws on first
 * use, naming the missing variable.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, property, receiver) {
    return Reflect.get(getAdminClient(), property, receiver);
  },
}) as SupabaseClient;
