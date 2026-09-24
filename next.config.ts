import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Standalone output: Creates a self-contained build for Docker
  // Reduces image size from ~1GB to ~200MB
  output: 'standalone',
};

export default nextConfig;
