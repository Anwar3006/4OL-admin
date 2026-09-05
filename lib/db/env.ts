/**
 * Supabase connection settings, resolved in one place.
 *
 * Before the cleanup these were re-read (with slightly different fallback
 * chains) in five separate client modules, so a rename of one env var fixed
 * three call sites and quietly missed two.
 */

export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not set. Add it to .env.local.",
    );
  }
  return url;
}

/**
 * The publishable (anon) key. Safe to ship to the browser — every request
 * made with it is still subject to row-level security.
 */
export function supabaseAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY;
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_KEY) " +
        "is not set. Add it to .env.local.",
    );
  }
  return key;
}

/**
 * The service-role key. Bypasses all RLS.
 *
 * Never given a NEXT_PUBLIC_ fallback: Next.js inlines NEXT_PUBLIC_* into the
 * client bundle, so naming a secret that way ships it to every browser.
 *
 * The three accepted names are the union of what the five old client modules
 * read, kept so no existing deployment breaks. New environments should set
 * SUPABASE_SECRET_KEY only.
 */
export function supabaseServiceKey(): string {
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SECRET_KEY is not set (server-side only — never expose it to " +
        "the client). Add it to .env.local.",
    );
  }
  return key;
}
