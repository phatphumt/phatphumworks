import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components (PPR) is a poor fit for an always-dynamic, single-user
  // dashboard: every page reads the DB and depends on "now" in Asia/Bangkok.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
