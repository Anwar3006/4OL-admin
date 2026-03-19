import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SignJWT } from "jose";
import { headers } from "next/headers";

/**
 * POST /api/supabase-token
 *
 * Validates the caller's BetterAuth session, then mints a short-lived
 * Supabase-compatible JWT so that RLS policies using auth.jwt() ->> 'sub'
 * (or auth.uid()) recognise the user.
 *
 * Required env vars (add to .env.local):
 *   SUPABASE_JWT_SECRET   – found in Supabase Dashboard → Settings → API → JWT Secret
 */
export async function POST(req: NextRequest) {
  // 1. Validate BetterAuth session from incoming request headers
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) {
    console.error("[supabase-token] SUPABASE_JWT_SECRET env var is missing.");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  // 2. Sign a Supabase-compatible JWT
  //    - sub  : must match the user_id stored in user_profiles
  //    - role : "authenticated" tells Supabase to apply RLS authenticated policies
  //    - aud  : "authenticated" (required by Supabase)
  //    - exp  : 1 hour — mobile app should re-fetch before expiry
  const secret = new TextEncoder().encode(jwtSecret);

  const token = await new SignJWT({
    sub: session.user.id,
    role: "authenticated",
    email: session.user.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);

  return NextResponse.json({ token, expiresIn: 3600 });
}
