import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const apiInternalUrl = process.env.API_INTERNAL_URL || "http://localhost:3000";
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const config: NextConfig = {
  outputFileTracingRoot: repoRoot,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiInternalUrl}/api/:path*`,
      },
    ];
  },
};

export default config;
