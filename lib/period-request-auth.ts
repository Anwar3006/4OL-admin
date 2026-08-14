import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

function bearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  return header?.match(/^Bearer\s+(.+)$/i)?.[1];
}

/**
 * Resolves a request-scoped Supabase client for the Period Tracker routes.
 * The admin/browser client authenticates via cookies (@supabase/ssr); native
 * mobile has no cookie jar and instead sends `Authorization: Bearer <token>`,
 * so that token is forwarded as the client's own auth header. Either way,
 * Postgres RLS resolves auth.uid() from the same JWT — this is not a
 * service-role bypass, ownership is still enforced at the database.
 */
export async function getPeriodRequestClient(request: NextRequest) {
  const token = bearerToken(request);
  if (token) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      },
    );
    const { data: { user }, error } = await supabase.auth.getUser();
    return { supabase, user: error ? null : user };
  }
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}

/** For routes that only need to know who (if anyone) is calling, while every
 * query goes through the service-role admin client with manual ownership
 * checks (period/library, period/trivia — both already work this way). */
export async function getPeriodRequestUserId(request: NextRequest): Promise<string | null> {
  const { user } = await getPeriodRequestClient(request);
  return user?.id ?? null;
}
