import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Roles allowed into the admin web app. Everyone else — critically, the
 * "customer" role used by the mobile app — is bounced back to /login even
 * if they hold a perfectly valid Supabase session (e.g. because they're
 * already logged into the mobile app in the same browser).
 */
const ADMIN_ROLES = ["super_admin", "admin", "registrar"];

// Routes that must stay reachable without a session: the auth flow itself,
// plus a couple of genuinely public pages.
const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/register",
  "/accept-invite",
  "/forgot-password",
  "/reset-password",
  "/verify-otp",
  "/privacy-policy",
  "/support",
  "/under-construction",
  "/delete-account",
];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

// Next.js 16 convention: this file replaces middleware.ts, and the
// exported function must be named `proxy` (not `middleware`).
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Mobile-facing and other non-admin API routes (/api/user, /api/auth,
  // /api/facilities, /api/cron, etc.) are untouched here — they do their
  // own bearer-token auth per route. This proxy only gates the admin
  // dashboard pages and the /api/admin/* surface.
  const isAdminApi = pathname.startsWith("/api/admin");
  const isDashboardPage = !isPublicPath(pathname) && !pathname.startsWith("/api");

  if (!isAdminApi && !isDashboardPage) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const denyToLogin = (reason: string) => {
    if (isAdminApi) {
      return NextResponse.json({ error: reason }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "unauthorized");
    const redirect = NextResponse.redirect(loginUrl);
    // Wipe any Supabase auth cookies so a mobile-app session can't just be
    // retried against the dashboard again on the next request.
    request.cookies.getAll().forEach((cookie) => {
      if (cookie.name.startsWith("sb-")) redirect.cookies.delete(cookie.name);
    });
    return redirect;
  };

  if (!user) {
    return denyToLogin("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.role || !ADMIN_ROLES.includes(profile.role)) {
    return denyToLogin("Forbidden");
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets and Next internals; the
    // function itself narrows further to dashboard pages + /api/admin/*.
    "/((?!_next/static|_next/image|favicon.ico|assets|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|json)$).*)",
  ],
};
