import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { supabaseAnonKey, supabaseUrl } from "./db/env";

/**
 * Bearer-token authentication for the mobile API surface.
 *
 * ── Why this module exists ──────────────────────────────────────────────
 *
 * Every one of the 32 contracted mobile routes used to start with its own
 * copy of:
 *
 *     const admin = getAdminClient();
 *     const { data: { user } } = await admin.auth.getUser(token);
 *
 * `getUser(token)` is a NETWORK CALL to GoTrue. So a mobile request spent one
 * round trip proving who the caller was before it did any work, doubling the
 * latency of routes whose actual query takes single-digit milliseconds. With
 * the database in eu-west-1 and users in Ghana, that round trip is real money.
 *
 * The token is already a signed JWT. Verifying it locally proves the same
 * thing without asking anyone.
 *
 * ── Why the client is module-scoped, unlike getAdminClient() ────────────
 *
 * `lib/db/admin.ts` is deliberately a factory (see its comments): a
 * module-scope service-role client is a loaded gun. This module is the
 * opposite case and the reasoning does not carry over:
 *
 *   - It holds the PUBLISHABLE key, not the service key. Nothing here can
 *     bypass RLS, so there is no privilege to leak.
 *   - It MUST be module-scoped to work at all. supabase-js caches the JWKS
 *     on the client instance (`jwks`, `jwks_cached_at`). A fresh client per
 *     request means a fresh JWKS fetch per request — which is the network
 *     call we came here to remove, wearing a different hat.
 *
 * One instance per warm serverless invocation: first request fetches the
 * JWKS, every subsequent one verifies from memory.
 *
 * ── Rollover behaviour (important) ──────────────────────────────────────
 *
 * `getClaims()` verifies locally ONLY when the token is signed with an
 * asymmetric key (ES256/RS256) and carries a `kid`. For a legacy HS256 token
 * it cannot verify without the shared secret, so it falls back to the network
 * `getUser()` call by itself.
 *
 * That fallback is what makes migrating signing keys safe. Access tokens
 * minted before the migration stay HS256 and remain valid until they expire;
 * they take the slow path, and the app keeps working. As sessions refresh,
 * traffic moves to the fast path on its own.
 *
 * Watch it drain: `[mobile-auth] slow path` in the logs should fall to zero
 * within about an hour of the key migration. If it does not, the project is
 * still issuing HS256 tokens and the optimisation is not active.
 */

/** How long verification took, and which path it took. */
export interface AuthTiming {
  /** Milliseconds spent inside getRequestUser. */
  ms: number;
  /** "local" = signature verified in-process; "network" = HS256 fallback. */
  path: "local" | "network" | "rejected";
}

/** Timing of the most recent verification on this instance. */
export let lastAuthTiming: AuthTiming = { ms: 0, path: "local" };

export interface RequestUser {
  id: string;
  email: string | null;
  /** Raw `user_metadata` claim — callers read avatar_url, full_name, etc. */
  user_metadata: Record<string, unknown>;
  /** Postgres role from the token. Always "authenticated" here. */
  role: string;
}

let verifier: SupabaseClient | null = null;

function getVerifier(): SupabaseClient {
  if (!verifier) {
    verifier = createClient(supabaseUrl(), supabaseAnonKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return verifier;
}

/**
 * Warm the JWKS on a cold instance, before the first request needs it.
 *
 * The module-scoped client above makes the JWKS cache survive between requests
 * on a WARM instance. A COLD one still starts empty — and on that first
 * request, verification blocks on fetching the key set from Supabase, which is
 * a full round trip to Ireland (~230 ms measured) stacked on top of whatever
 * the cold start already cost. Under a ramp, every new instance Vercel spins up
 * pays it, which is exactly the shape of a bad p99.
 *
 * Kicking the fetch off at module load lets it overlap with the rest of the
 * function's initialisation instead of sitting in the critical path. Deliberately
 * not awaited: a slow or failing JWKS must never stop the module from loading —
 * verification will simply fetch it on demand as before.
 */
let jwksWarmup: Promise<unknown> | null = null;

function warmJwks(): void {
  if (jwksWarmup) return;
  try {
    // A throwaway token: we do not care about the result, only the side effect
    // of populating the client's JWKS cache. An invalid token still triggers
    // the key fetch before it fails.
    jwksWarmup = getVerifier()
      .auth.getClaims("warmup.invalid.token")
      .catch(() => undefined);
  } catch {
    jwksWarmup = null;
  }
}

warmJwks();

/** Pull the bearer token out of the Authorization header. */
export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const [scheme, ...rest] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer") return null;
  const token = rest.join("");
  return token.length > 0 ? token : null;
}

/**
 * Verify the caller's JWT and return the user, or null if the request is not
 * authenticated. Never throws — callers reply 401 on null.
 *
 * Drop-in replacement for the old per-route `getRequestUser`. The returned
 * shape keeps `id`, `email` and `user_metadata` so existing call sites do not
 * change beyond the import.
 */
export async function getRequestUser(req: Request): Promise<RequestUser | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  const startedAt = Date.now();
  const done = (path: AuthTiming["path"]) => {
    lastAuthTiming = { ms: Date.now() - startedAt, path };
  };

  try {
    const { data, error } = await getVerifier().auth.getClaims(token);

    if (error || !data?.claims) {
      // Expired, tampered, or an unknown signing key. Not worth distinguishing
      // for the caller — all of them are 401 — but log the reason.
      if (error) console.warn("[mobile-auth] rejected:", error.message);
      done("rejected");
      return null;
    }

    const claims = data.claims as Record<string, unknown>;

    // `getClaims` validates the signature and `exp`, but not who the token is
    // FOR. Check that explicitly: a service-role key is also a well-formed,
    // correctly-signed JWT, and it must never be accepted as a user identity.
    if (claims.role !== "authenticated") {
      console.warn(
        `[mobile-auth] rejected: role "${String(claims.role)}" is not authenticated`,
      );
      done("rejected");
      return null;
    }

    const sub = typeof claims.sub === "string" ? claims.sub : null;
    if (!sub) {
      console.warn("[mobile-auth] rejected: token has no sub claim");
      done("rejected");
      return null;
    }

    // Asymmetric tokens carry a `kid` and were verified in-process. HS256 ones
    // went out to GoTrue inside getClaims — correct, but it is the round trip
    // this module exists to remove, so make it visible.
    const isSymmetric =
      typeof data.header?.alg === "string" && data.header.alg.startsWith("HS");
    done(isSymmetric ? "network" : "local");

    if (isSymmetric) {
      console.warn(
        "[mobile-auth] slow path: HS256 token verified over the network. " +
          "Expected during signing-key rollover; should stop once old sessions expire.",
      );
    }

    return {
      id: sub,
      email: typeof claims.email === "string" ? claims.email : null,
      user_metadata:
        claims.user_metadata && typeof claims.user_metadata === "object"
          ? (claims.user_metadata as Record<string, unknown>)
          : {},
      role: "authenticated",
    };
  } catch (err) {
    // Network failure on the HS256 fallback, or a malformed token that threw
    // rather than returning an error. Fail closed.
    console.error("[mobile-auth] verification threw:", err);
    done("rejected");
    return null;
  }
}
