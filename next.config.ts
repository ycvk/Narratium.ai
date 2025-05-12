import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next",
  images: {
    domains: ["localhost"],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  devIndicators: false,
};

export default nextConfig;
