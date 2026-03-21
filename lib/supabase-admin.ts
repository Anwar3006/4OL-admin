import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client — uses the service_role key which bypasses ALL RLS.
 *
 * IMPORTANT: This client must NEVER be imported from client-side code or
 * shipped to the mobile app. It is for server-side API routes only.
 * Every route that uses this client must first validate the caller's
 * BetterAuth session before performing any operation.
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "[supabase-admin] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY " +
        "env var is missing. Add it to .env.local (server-side only — never expose to client).",
    );
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
