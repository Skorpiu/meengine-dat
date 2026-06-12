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
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: ".",
  testMatch: ["tests/**/*.spec.ts", "e2e/**/*.spec.ts"],
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: e2eBaseUrl,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    /*
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    */

    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    /*
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    */

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
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
