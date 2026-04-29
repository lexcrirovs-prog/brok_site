import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/invest";

const nextConfig: NextConfig = {
  basePath,
  output: "standalone",
  experimental: {
    cpus: Number(process.env.NEXT_BUILD_CPUS ?? 1),
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 1000,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
