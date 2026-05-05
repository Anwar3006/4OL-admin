import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase browser client for use in Next.js Client Components.
 *
 * Uses @supabase/ssr's createBrowserClient which stores the session in
 * COOKIES (not just localStorage), making it visible to Server Actions,
 * Server Components, and middleware — all of which read from cookies.
 *
 * This is required for server actions like getUserProfile() to see the
 * logged-in session via getSupabaseServerClient().auth.getUser().
 */
export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_KEY!,
  );
}
