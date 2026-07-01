import { test, expect } from "@playwright/test";
import {
  assertSmokeFixturePreflightAllowed,
  assertSmokeFixtureEnvVars,
} from "../helpers/env-guards";
import {
  runSmokeFixturePreflight,
  summarizeSmokeFixtureResults,
} from "../helpers/smoke-fixture-preflight";
import { assertNoFatalPageErrors, loginWithCredentials } from "../helpers/auth";

const adminEmail = process.env.DAT_SMOKE_ADMIN_EMAIL?.trim();
const adminPassword = process.env.DAT_SMOKE_ADMIN_PASSWORD;
const hasAdminCredentials = Boolean(adminEmail && adminPassword);

test.beforeAll(() => {
  assertSmokeFixturePreflightAllowed();
});

test.describe("Production smoke (fixture preflight)", () => {
  test("@fixture-preflight smoke fixtures are present and safe", async ({
    page,
  }) => {
    test.skip(
      !hasAdminCredentials,
      "Set DAT_SMOKE_ADMIN_EMAIL and DAT_SMOKE_ADMIN_PASSWORD (see docs/ops/production-smoke-e2e.md).",
    );

    const fixtureConfig = assertSmokeFixtureEnvVars();

    await loginWithCredentials(page, adminEmail!, adminPassword!);

    await expect(page).toHaveURL(/\/admin(?:\/|$|\?)/i);
    await expect(page.getByText(/admin dashboard/i)).toBeVisible();
    await assertNoFatalPageErrors(page);

    await page.goto("/admin/lessons");
    await expect(
      page.getByRole("heading", { name: /lesson management/i }),
    ).toBeVisible();
    await assertNoFatalPageErrors(page);

    const results = await runSmokeFixturePreflight(async (path, init) => {
      const response = await page.request.get(path, {
        headers: init?.headers,
      });
      return {
        ok: response.ok(),
        status: response.status(),
        json: () => response.json(),
      };
    }, fixtureConfig);

    for (const result of results) {
      const label = result.ok
        ? result.detail.startsWith("WARN:")
          ? "WARN"
          : "PASS"
        : "FAIL";
      console.log(`${label}: ${result.name} — ${result.detail}`);
    }

    const summary = summarizeSmokeFixtureResults(results);
    if (!summary.ok) {
      const details = summary.failed
        .map((result) => `${result.name}: ${result.detail}`)
        .join("; ");
      throw new Error(`Smoke fixture preflight failed — ${details}`);
    }

    expect(summary.ok).toBe(true);
  });
});
