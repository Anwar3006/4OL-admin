import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SignJWT } from "jose";

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
  // 1. Manually extract the token from the Authorization header
  // since mobile doesn't use cookies.
  const authHeader = req.headers.get("authorization");
  const reqToken = authHeader?.split(" "); // Get the 'XYZ' from 'Bearer XYZ'

  if (!reqToken) {
    return NextResponse.json({ error: "No token provided" }, { status: 401 });
  }

  // 2. Validate using the token directly
  // BetterAuth's getSession is designed for cookies;
  // With the 'bearer' plugin enabled, auth.api.getSession will now recognize
  // the Authorization header automatically.
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user?.id) {
    console.log("[supabase-token] No valid session found. Headers:", {
      auth: authHeader ? "Present" : "Missing",
      session: session ? "Found but invalid" : "Null",
    });
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

  // 3. Sign a Supabase-compatible JWT
  //    - sub  : must match the user_id stored in user_profiles
  //    - role : "authenticated" tells Supabase to apply RLS authenticated policies
  //    - aud  : "authenticated" (required by Supabase)
  //    - exp  : 1 hour — mobile app should re-fetch before expiry
  try {
    const secret = new TextEncoder().encode(jwtSecret);

    const token = await new SignJWT({
      sub: session.user.id,
      role: "authenticated",
      email: session.user.email,
    })
      // typ:"JWT" is required — PostgREST rejects tokens without it.
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);

    return NextResponse.json({ token, expiresIn: 3600 });
  } catch (err: any) {
    console.error("[supabase-token] Signing error:", err.message);
    return NextResponse.json(
      { error: "Internal Server Error", message: err.message },
      { status: 500 },
    );
  }
}
