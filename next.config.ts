import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/polymarket/:path*",
        destination: "https://gamma-api.polymarket.com/:path*",
      },
    ];
  },
};

export default nextConfig;
