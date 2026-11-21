import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@aims/core",
    "@aims/nlp",
    "@aims/sentiment",
    "@aims/topics",
    "@aims/coding",
    "@aims/embeddings",
    "@aims/survey",
    "@aims/export",
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
