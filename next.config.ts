import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard/overview",
        permanent: true,
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
