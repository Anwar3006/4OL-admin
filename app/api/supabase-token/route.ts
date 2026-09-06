import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { getAdminClient } from "@/lib/db/admin";

/**
 * POST /api/supabase-token
 *
 * Validates the caller's Supabase access token (sent as a Bearer token —
 * mobile doesn't use cookies), then mints a short-lived Supabase-compatible
 * JWT so that RLS policies using auth.jwt() ->> 'sub' (or auth.uid())
 * recognise the user.
 *
 * Required env vars (add to .env.local):
 *   SUPABASE_JWT_SECRET   – found in Supabase Dashboard → Settings → API → JWT Secret
 */
export async function POST(req: NextRequest) {
  // 1. Manually extract the token from the Authorization header.
  const authHeader = req.headers.get("authorization");
  const reqToken = authHeader?.split(" ")[1]; // Get the 'XYZ' from 'Bearer XYZ'

  if (!reqToken) {
    return NextResponse.json({ error: "No token provided" }, { status: 401 });
  }

  // 2. Validate the token against Supabase Auth directly.
  const admin = getAdminClient();
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(reqToken);

  if (userError || !user?.id) {
    console.log("[supabase-token] No valid session found. Headers:", {
      auth: authHeader ? "Present" : "Missing",
      error: userError?.message,
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
      sub: user.id,
      role: "authenticated",
      email: user.email,
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
