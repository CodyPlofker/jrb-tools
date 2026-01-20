import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server-side env vars (like ANTHROPIC_API_KEY) are automatically available
  // via process.env in API routes - no need to configure them here.
  // The `env` config is only needed for exposing vars to client-side code.
};

export default nextConfig;
