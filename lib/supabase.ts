import { createClient } from "@supabase/supabase-js";

import { getBrowserClient } from "@/lib/db/browser";

/**
 * @deprecated Import `getBrowserClient` from `@/lib/db/browser` instead.
 *
 * ⚠️ THESE TWO EXPORTS DO NOT SHARE A SESSION. Read this before migrating
 * anything off them.
 *
 * `supabase` is a plain supabase-js client. It keeps its session in
 * localStorage. `getSupabaseClient()` is an @supabase/ssr browser client and
 * keeps its session in COOKIES — which is where sign-in actually writes it,
 * and where Server Components and middleware read it from.
 *
 * So a component using `supabase` is very likely querying as the `anon` role
 * rather than as the signed-in admin, and any table that requires
 * `authenticated` will come back EMPTY rather than erroring — the same
 * silent-empty failure mode that hid three broken features in this codebase
 * (see lib/db/README.md).
 *
 * Migrating a caller from `supabase` to `getBrowserClient()` is therefore a
 * real behaviour change: it may start returning rows where it previously
 * returned none. That is usually the fix, but verify each call site rather
 * than sweeping them.
 *
 * NOTE ON ENV: read inline with the original non-null assertions rather than
 * through lib/db/env.ts. The helpers there throw on a missing variable, and
 * this client is constructed at module scope — so routing it through them
 * would turn a misconfigured environment from "fails at query time" into
 * "fails at build time" for every module that imports this file. Preserved
 * as-is deliberately; the replacement modules do the strict thing.
 */
const legacyUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const legacyKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_KEY!;

export const supabase = createClient(legacyUrl, legacyKey);

/**
 * @deprecated Import `getBrowserClient` from `@/lib/db/browser` instead.
 *
 * Kept `async` because existing callers `await` it. Behaviour unchanged.
 */
export const getSupabaseClient = async () => getBrowserClient();
