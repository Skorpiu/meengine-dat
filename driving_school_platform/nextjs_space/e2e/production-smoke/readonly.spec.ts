import { test, expect } from "@playwright/test";
import { assertSmokeTargetAllowed } from "../helpers/env-guards";
import {
  checkHealthEndpoint,
  checkSignupBlocked,
} from "../helpers/smoke-api-checks";
import {
  assertNoFatalPageErrors,
  attemptInvalidLogin,
  loginWithCredentials,
  logoutFromApp,
} from "../helpers/auth";

const adminEmail = process.env.DAT_SMOKE_ADMIN_EMAIL?.trim();
const adminPassword = process.env.DAT_SMOKE_ADMIN_PASSWORD;
const hasAdminCredentials = Boolean(adminEmail && adminPassword);

const instructorEmail = process.env.DAT_SMOKE_INSTRUCTOR_EMAIL?.trim();
const instructorPassword = process.env.DAT_SMOKE_INSTRUCTOR_PASSWORD;
const hasInstructorCredentials = Boolean(instructorEmail && instructorPassword);

test.beforeAll(() => {
  assertSmokeTargetAllowed();
});

test.describe("Production smoke (read-only)", () => {
  test("@readonly health and public signup are guarded", async () => {
    const { baseUrl } = assertSmokeTargetAllowed();

    const health = await checkHealthEndpoint(baseUrl);
    expect(health.ok, health.detail).toBe(true);

    const signup = await checkSignupBlocked(baseUrl);
    expect(signup.ok, signup.detail).toBe(true);
  });

  test("@readonly invalid login is rejected", async ({ page }) => {
    await attemptInvalidLogin(page);
  });

  test("@readonly admin can login and load core pages", async ({ page }) => {
    test.skip(
      !hasAdminCredentials,
      "Set DAT_SMOKE_ADMIN_EMAIL and DAT_SMOKE_ADMIN_PASSWORD (see docs/ops/production-smoke-e2e.md).",
    );

    await loginWithCredentials(page, adminEmail!, adminPassword!);

    await expect(page).toHaveURL(/\/admin(?:\/|$|\?)/i);
    await expect(page.getByText(/admin dashboard/i)).toBeVisible();
    await assertNoFatalPageErrors(page);

    await page.goto("/admin/users");
    await expect(
      page.getByRole("heading", { name: /^people$/i }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /^students$/i })).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /^instructors$/i }),
    ).toBeVisible();
    await assertNoFatalPageErrors(page);

    await page.goto("/admin/license");
    await expect(
      page.getByRole("heading", { name: /plan & features/i }),
    ).toBeVisible();
    await assertNoFatalPageErrors(page);

    await logoutFromApp(page);
  });

  test("@readonly instructor dashboard loads when credentials provided", async ({
    page,
  }) => {
    test.skip(
      !hasInstructorCredentials,
      "Set DAT_SMOKE_INSTRUCTOR_EMAIL and DAT_SMOKE_INSTRUCTOR_PASSWORD to run instructor smoke (optional).",
    );

    await loginWithCredentials(page, instructorEmail!, instructorPassword!);

    await expect(page).toHaveURL(/\/instructor(?:\/|$|\?)/i);
    await expect(page.getByText(/instructor dashboard/i)).toBeVisible();
    await assertNoFatalPageErrors(page);

    await logoutFromApp(page);
  });
});
