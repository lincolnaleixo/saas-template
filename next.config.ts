import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-email/render"],
  experimental: {
    // Client-side router cache configuration for better back/forward navigation
    staleTimes: {
      // Keep dynamic pages in cache for 5 minutes (300 seconds)
      dynamic: 300,
      // Keep static pages in cache for 5 minutes as well
      static: 300,
    },
  },
};

export default nextConfig;
