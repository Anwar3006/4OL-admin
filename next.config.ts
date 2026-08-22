import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: true,
      },
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
