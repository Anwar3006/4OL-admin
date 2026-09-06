import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: true,
      },

      // ── Retired duplicate routes (E2) ──────────────────────────────────
      //
      // Each of these was a directory holding a single page.tsx whose only
      // job was to call `redirect()`. That works, but it redirects LATE: the
      // request goes through middleware, Next renders a server component,
      // and only then does the browser navigate. Admins saw the dashboard
      // shell flash before landing on the real page.
      //
      // Declaring them here moves the redirect ahead of rendering entirely,
      // and puts every legacy path in one readable list instead of ten files
      // scattered through app/.
      //
      // `permanent: false` (307) is deliberate, and matches what the deleted
      // stubs already did — `redirect()` defaults to 307. A 308 would be
      // semantically truer, since these consolidations are not planned to be
      // undone, but browsers cache a 308 indefinitely: if one of these paths
      // ever has to become a real page again, every admin who visited it
      // once would keep redirecting with no server-side way to stop them.
      // For an authenticated admin panel the extra round trip costs nothing
      // and the reversibility is worth keeping.
      //
      // These sources are EXACT on purpose. A wildcard such as
      // `/ai-hub/:path*` would look tidier and would swallow /ai-hub/period
      // and /ai-hub/period/content, which are live, unique pages that are in
      // no sidebar — the sweep found them behind five sibling stubs. Add new
      // entries one path at a time.
      { source: "/human-anatomy", destination: "/anatomy", permanent: false },
      { source: "/platform-schematic", destination: "/schematic", permanent: false },
      { source: "/security-center", destination: "/security", permanent: false },

      { source: "/medication-enquiry", destination: "/medenquiry", permanent: false },
      { source: "/medication-enquiry/delivery", destination: "/medenquiry?tab=delivery", permanent: false },
      { source: "/medication-enquiry/escrow", destination: "/medenquiry?tab=escrow", permanent: false },
      { source: "/medication-enquiry/pending", destination: "/medenquiry?tab=pending", permanent: false },

      { source: "/ai-hub", destination: "/ai", permanent: false },
      { source: "/ai-hub/analytics", destination: "/ai?tab=analytics", permanent: false },
      { source: "/ai-hub/models", destination: "/ai?tab=models", permanent: false },
      { source: "/ai-hub/moderation", destination: "/ai?tab=moderation", permanent: false },
      { source: "/ai-hub/recommendations", destination: "/ai?tab=recommendations", permanent: false },

      // ── Hollow facility-type routes (E3.3) ────────────────────────────
      //
      // Each of these was a hand-written page.jsx rendering an empty div,
      // with its real component commented out and the directory those
      // comments named — components/redesign/auth/Facilities/ — long gone.
      //
      // They were worse than empty. A static segment beats a dynamic one in
      // Next, so /facilities/hospitals resolved to the empty shell and
      // shadowed /facilities/[type], which is a complete working listing.
      // Measured before this change: the shadowed pages returned ~18,396
      // bytes with no search box, the real one ~21,962 bytes with one.
      //
      // Deleting the shells alone would NOT have fixed it. The slugs below
      // do not match the data: facility_type is `dental_clinic`, `home`,
      // `pharmacy`, while the pages were `dental`, `homes`, `pharmacies`, so
      // falling through to [type] would render an empty table for a type
      // that does not exist. The destinations map each legacy slug onto the
      // real FACILITY_TYPE_ENUM value and hand it to /facilities, which
      // already filters on `?type=` (-> .eq("facility_type", type)).
      //
      // `hospital_/_clinic` genuinely contains a slash; %2F is required.
      { source: "/facilities/hospitals", destination: "/facilities?type=hospital_%2F_clinic", permanent: false },
      { source: "/facilities/dental", destination: "/facilities?type=dental_clinic", permanent: false },
      { source: "/facilities/pharmacies", destination: "/facilities?type=pharmacy", permanent: false },
      { source: "/facilities/eye-care", destination: "/facilities?type=eye_clinic", permanent: false },
      { source: "/facilities/homes", destination: "/facilities?type=home", permanent: false },
      { source: "/facilities/diagnostic-labs", destination: "/facilities?type=diagnostic_lab", permanent: false },
      { source: "/facilities/osteopathy", destination: "/facilities?type=osteopathy_center", permanent: false },
      { source: "/facilities/physiotherapy", destination: "/facilities?type=physiotherapy_center", permanent: false },
      { source: "/facilities/prosthetics", destination: "/facilities?type=prosthetics_center", permanent: false },
      { source: "/facilities/health-school", destination: "/facilities?type=health_school", permanent: false },

      // The matching "create" shells. /facilities carries the Add Facility
      // dialog, so the type filter is the closest honest landing spot.
      { source: "/facilities/add-facility", destination: "/facilities", permanent: false },
      { source: "/facilities/hospitals/create", destination: "/facilities?type=hospital_%2F_clinic", permanent: false },
      { source: "/facilities/dental/create", destination: "/facilities?type=dental_clinic", permanent: false },
      { source: "/facilities/eye-care/create", destination: "/facilities?type=eye_clinic", permanent: false },
      { source: "/facilities/homes/create", destination: "/facilities?type=home", permanent: false },
      { source: "/facilities/diagnostic-labs/create", destination: "/facilities?type=diagnostic_lab", permanent: false },

      // These two were already redirects, but client-side ones: a "use
      // client" page that router.replace()d inside useEffect. That is the
      // late redirect described above — the dashboard shell renders first.
      // Same destinations, moved ahead of rendering.
      { source: "/facilities/featured", destination: "/facilities?tab=featured", permanent: false },
      { source: "/facilities/top-rated", destination: "/facilities?tab=top-rated", permanent: false },

      // Marketing sub-routes collapsed into the unified page (M-D6). These
      // were server-side `redirect()` stubs, which is already ahead of the
      // client-side kind — but a config redirect skips rendering entirely.
      { source: "/marketing/discounts", destination: "/marketing?tab=discounts", permanent: false },
      { source: "/marketing/subscriptions", destination: "/marketing?tab=subscriptions", permanent: false },

      // ── Kebab-case page routes (E3.3) ─────────────────────────────────
      //
      // /healthy_living used an underscore; /facilityscout and /bedtracker ran
      // the words together. The features were already kebab-case
      // (features/healthy-living, facility-scout, bed-tracker) — only the URLs
      // lagged. Every in-app link was updated in the same commit, so these
      // exist for bookmarks and anything outside the repo.
      //
      // The `/api/*` prefixes are deliberately NOT renamed. /api/facilityscout
      // and /api/bedtracker keep their spelling: no mobile route depends on
      // them, but they are a URL contract for the admin app and renaming them
      // buys nothing this epic asked for. The page/API spelling mismatch is
      // the same one /healthy_living vs /api/healthy-living already had, now
      // in the other direction, and it is written up in each feature README.
      { source: "/healthy_living", destination: "/healthy-living", permanent: false },
      { source: "/facilityscout", destination: "/facility-scout", permanent: false },
      { source: "/bedtracker", destination: "/bed-tracker", permanent: false },
    ];
  },

  async headers() {
    // Conservative hardening set. A full CSP (script-src etc.) is
    // intentionally omitted: Next.js injects inline scripts/styles and the
    // app loads Supabase assets, so a strict CSP would break the panel
    // without adding real value over the existing RLS + service-role
    // architecture. The single `frame-ancestors` directive below (Part AK,
    // AK-D10) is exempt from that concern — it only governs embedding and
    // stops automation frameworks from loading the panel inside an
    // iframe-driven agent harness.
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },

  sassOptions: {
    silenceDeprecations: ["import"],
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hedjrvdvvhcbmqryrhjg.supabase.co",
        pathname: "/storage/v1/s3/**",
      },
      {
        protocol: "https",
        hostname: "hedjrvdvvhcbmqryrhjg.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      {
        protocol: "https",
        hostname: "rwutaufwmebkyipekybp.supabase.co",
        pathname: "/storage/v1/**",
      },
      {
        protocol: "https",
        hostname: "rhbbxttxnvcziyqzptqs.supabase.co",
        pathname: "/storage/v1/**",
      },
    ],
  },
};

export default nextConfig;
