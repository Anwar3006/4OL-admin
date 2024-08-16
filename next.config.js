/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bqdohqgwdqrpmzffmsva.supabase.co/storage/v1/s3'
      }
    ]
  }
  //output: "standalone",
};

module.exports = nextConfig;
