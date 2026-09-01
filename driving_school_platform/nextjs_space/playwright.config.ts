import { defineConfig, devices } from "@playwright/test";

import { assertLocalBrowserE2eConfig } from "./e2e/helpers/local-e2e-guards";

const localE2e = assertLocalBrowserE2eConfig();

/**
 * Local disposable browser-E2E only.
 * Matches `e2e/local/**`. Never discovers demo-smoke, production-smoke, or
 * mobile-viewports. Bare Playwright execution without the orchestrator marker
 * fail-closes and cannot enter Production Smoke.
 */
export default defineConfig({
  testDir: "./e2e/local",
  testMatch: ["**/*.spec.ts"],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: localE2e.baseUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: undefined,
});
