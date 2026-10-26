import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Use standalone output for Docker containers; use default for native Vercel serverless
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
};

export default nextConfig;
