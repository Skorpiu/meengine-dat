/** @type {import('next').NextConfig} */
const isDisposableBrowserE2eOrchestrator =
  process.env.DAT_E2E_ORCHESTRATOR_ACTIVE === "1";

const nextConfig = {
  // Usa os defaults do Next/Vercel
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
  ...(isDisposableBrowserE2eOrchestrator
    ? {
        // Prevent next dev from writing AGENTS.md / CLAUDE.md during disposable E2E.
        agentRules: false,
        // Avoid isolated dev output that rewrites next-env.d.ts to .next/dev/types.
        isolatedDevBuild: false,
      }
    : {}),
};

module.exports = nextConfig;
