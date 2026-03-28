import type { NextConfig } from "next";
import { execFileSync } from "child_process";

function getAppVersion(): string {
  if (process.env.APP_VERSION) return process.env.APP_VERSION;
  try {
    return execFileSync("git", ["describe", "--tags", "--abbrev=0"], { encoding: "utf8" }).trim();
  } catch {
    return "dev";
  }
}

// Backend URL used by the Next.js server-side proxy.
// In Docker Compose the backend service is always reachable at http://backend:3001.
// Override with BACKEND_URL env var at build time if needed.
const backendUrl = process.env.BACKEND_URL || "http://backend:3001";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [],
  },
  output: 'standalone',
  env: {
    NEXT_PUBLIC_APP_VERSION: getAppVersion(),
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
