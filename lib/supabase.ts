import { createClient } from "@supabase/supabase-js";

/**
 * @deprecated Import `getBrowserClient` from `@/lib/db/browser` instead.
 *
 * ⚠️ THIS IS THE ANON CLIENT. It is a plain supabase-js client keeping its
 * session in localStorage — NOT the cookies that sign-in actually writes to,
 * and not what Server Components and middleware read. So a component using it
 * very likely queries as the `anon` role rather than as the signed-in admin,
 * and any table requiring `authenticated` comes back EMPTY rather than
 * erroring — the silent-empty failure mode that hid three broken features in
 * this codebase, and a fourth (`view-medication-reminder-details`) found in
 * September 2026. See lib/db/README.md.
 *
 * **Two callers remain**, and neither has been verified:
 *   features/medication-reminder/ui/MedicationStats.tsx
 *   components/editor/plugins/drag-drop-paste-plugin.tsx
 *
 * Moving them to `getBrowserClient()` is a REAL BEHAVIOUR CHANGE — it may
 * start returning rows where it previously returned none, which is usually
 * the fix but must be checked per call site against the database. That needs
 * credentials; it was deliberately not swept blind. The sibling export
 * `getSupabaseClient()` was a pure alias for `getBrowserClient()` and its 23
 * callers were migrated mechanically; it is gone.
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