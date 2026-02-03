import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.backblazeb2.com',
      },
      {
        protocol: 'https',
        hostname: 's3.*.backblazeb2.com',
      },
      // Add your Cloudflare CDN domain when configured
      // {
      //   protocol: 'https',
      //   hostname: 'cdn.portfolioclaw.com',
      // },
    ],
  },
};

export default nextConfig;
