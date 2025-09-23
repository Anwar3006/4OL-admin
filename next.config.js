/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hedjrvdvvhcbmqryrhjg.supabase.co/storage/v1/s3",
      },
      {
        protocol: "https",
        hostname: "hedjrvdvvhcbmqryrhjg.supabase.co",
      },
    ],
  },
  //output: "standalone",
};

module.exports = nextConfig;
