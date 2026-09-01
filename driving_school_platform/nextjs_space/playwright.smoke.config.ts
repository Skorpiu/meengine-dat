import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.playwright") });

const e2eBaseUrl =
  process.env.DAT_SMOKE_BASE_URL ||
  process.env.E2E_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  "http://localhost:3000";

function isLocalE2eHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return true;
  }
}

const runningDemoSmokeOnly = process.argv.some((arg) =>
  arg.replace(/\\/g, "/").includes("demo-smoke.spec"),
);
const hasDemoSmokeCredentials = Boolean(
  process.env.E2E_DEMO_SCHOOL_ADMIN_EMAIL &&
    process.env.E2E_DEMO_SCHOOL_ADMIN_PASSWORD,
);
const shouldStartWebServer =
  isLocalE2eHost(e2eBaseUrl) &&
  process.env.E2E_SKIP_WEB_SERVER !== "1" &&
  !(runningDemoSmokeOnly && !hasDemoSmokeCredentials);

/**
 * Explicit hosted/demo/production smoke Playwright config.
 * Does not discover local disposable E2E specs. Preserve smoke target guards
 * in the specs themselves (`assertSmokeTargetAllowed`,
 * `assertProductionMutationsAllowed`).
 */
export default defineConfig({
  testDir: ".",
  testMatch: ["e2e/demo-smoke.spec.ts", "e2e/production-smoke/**/*.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: shouldStartWebServer
    ? {
        command: "pnpm dev",
        url: e2eBaseUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
