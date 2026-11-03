import { withSentryConfig } from "@sentry/nextjs";

const isDockerBuild = process.env.DOCKER_BUILD === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Local/CI builds run full ESLint + TypeScript checks (and /pre-push-gate enforces
  // pnpm lint + pnpm typecheck). Inside CT120's LXC memory cgroup, skipping the two
  // extra Node worker processes keeps peak RSS ~1 GiB instead of >3.1 GiB OOM.
  ...(isDockerBuild
    ? {
        eslint: { ignoreDuringBuilds: true },
        typescript: { ignoreBuildErrors: true },
      }
    : {}),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "minio.mkgbuilds.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  experimental: {
    // Keep node-ical external so its lazy require('temporal-polyfill') resolves
    // from node_modules at runtime (bundling breaks on Temporal polyfill init).
    // The standalone runner image ships these deps via the Dockerfile copy step.
    serverComponentsExternalPackages: ["node-ical"],
    // Prevent 8-core Next.js build worker fan-out from exceeding CT120's LXC memory cgroup
    ...(isDockerBuild
      ? { cpus: 2, workerThreads: false, webpackBuildWorker: false }
      : {}),
  },
  webpack(config) {
    if (isDockerBuild) {
      config.cache = false;
    }
    return config;
  },
  async rewrites() {
    // Route all /guide-media/* assets through /api/guide-media BEFORE public/
    // static file lookup so:
    // 1. Access-code-gated properties enforce guest unlock cookies on videos & photos
    // 2. Video Range requests return HTTP 206 Partial Content without gzip
    return {
      beforeFiles: [
        { source: "/guide-media/:path*", destination: "/api/guide-media/:path*" },
      ],
    };
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
