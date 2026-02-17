import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    serverActions: {
      allowedOrigins: ["blukastor.brandboost-ai.com.localhost:3000", "localhost:3000"],
    },
  },
};

export default nextConfig;
