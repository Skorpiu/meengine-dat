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

const shouldStartWebServer =
  isLocalE2eHost(e2eBaseUrl) && process.env.E2E_SKIP_WEB_SERVER !== "1";

/**
 * Opt-in mobile/tablet viewport smoke only.
 * Does not affect `playwright.config.ts` or production smoke suites.
 */
export default defineConfig({
  testDir: ".",
  testMatch: ["e2e/mobile-viewports/**/*.spec.ts"],
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
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "tablet-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 810, height: 1080 },
        isMobile: true,
        hasTouch: true,
      },
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
