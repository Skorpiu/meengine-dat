import { expect, type Page } from "@playwright/test";

const FATAL_ERROR_PATTERN =
  /application error|internal server error|something went wrong|unhandled runtime error/i;

export async function loginWithCredentials(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/auth/login");
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).not.toHaveURL(/\/auth\/login(?:\?|$)/i, {
    timeout: 30_000,
  });
}

export async function logoutFromApp(page: Page): Promise<void> {
  await page.getByRole("button", { name: /user menu/i }).click();
  await page.getByRole("menuitem", { name: /sign out/i }).click();
  await expect(page).not.toHaveURL(/\/(admin|instructor|student)(?:\/|$|\?)/i, {
    timeout: 15_000,
  });
}

/**
 * Single invalid login attempt (unique email) to avoid rate-limit spam.
 */
export async function attemptInvalidLogin(page: Page): Promise<void> {
  const email = `smoke-invalid-${Date.now()}@example.invalid`;
  await page.goto("/auth/login");
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill("definitely-wrong-password");
  await page.getByRole("button", { name: /^sign in$/i }).click();

  await expect(page).toHaveURL(/\/auth\/login(?:\?|$)/i, { timeout: 15_000 });
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(FATAL_ERROR_PATTERN)).toHaveCount(0);
}

export async function assertNoFatalPageErrors(page: Page): Promise<void> {
  await expect(page.getByText(FATAL_ERROR_PATTERN)).toHaveCount(0);
}
