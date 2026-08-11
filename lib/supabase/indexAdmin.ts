import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
// NOTE: never add a NEXT_PUBLIC_-prefixed fallback here — Next.js inlines
// NEXT_PUBLIC_* vars into the client bundle, so naming a secret that way is
// a footgun even if nothing currently sets it.
const supabaseServiceKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    "[supabaseAdmin] Missing NEXT_PUBLIC_SUPABASE_URL or secret/service key env. Storage admin actions may fail.",
  );
}

export const supabaseAdmin = createClient(
  supabaseUrl || "",
  supabaseServiceKey || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
