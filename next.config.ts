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
