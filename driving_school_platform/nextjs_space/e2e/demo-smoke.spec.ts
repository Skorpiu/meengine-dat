import { test, expect, type Page } from "@playwright/test";

const demoAdminEmail = process.env.E2E_DEMO_SCHOOL_ADMIN_EMAIL;
const demoAdminPassword = process.env.E2E_DEMO_SCHOOL_ADMIN_PASSWORD;
const hasDemoCredentials = Boolean(demoAdminEmail && demoAdminPassword);

async function loginAsDemoSchoolAdmin(page: Page) {
  await page.goto("/auth/login");
  await page.getByLabel(/^email$/i).fill(demoAdminEmail!);
  await page.getByLabel(/^password$/i).fill(demoAdminPassword!);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).not.toHaveURL(/\/auth\/login/i, { timeout: 30_000 });
}

test.describe("Demo tenant smoke (read-only)", () => {
  test.skip(
    !hasDemoCredentials,
    "Set E2E_DEMO_SCHOOL_ADMIN_EMAIL and E2E_DEMO_SCHOOL_ADMIN_PASSWORD (see docs/ops/e2e-smoke.md).",
  );

  test("Demo School Admin signs in, views admin dashboard, signs out", async ({
    page,
  }) => {
    await loginAsDemoSchoolAdmin(page);

    await expect(page).toHaveURL(/\/admin(?:\/|$|\?)/i);
    await expect(
      page.getByRole("heading", { name: /admin dashboard/i }),
    ).toBeVisible();

    await expect(
      page.getByText(
        /application error|internal server error|something went wrong|unhandled runtime error/i,
      ),
    ).toHaveCount(0);

    await page.getByRole("button", { name: /user menu/i }).click();
    await page.getByRole("menuitem", { name: /sign out/i }).click();

    await expect(page).not.toHaveURL(/\/admin(?:\/|$|\?)/i, {
      timeout: 15_000,
    });
  });
});
