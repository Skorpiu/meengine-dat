import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, email: string, password: string) {
  await page.goto('/auth/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /login|sign in/i }).click();

  // garante que não ficaste preso no login
  await expect(page).not.toHaveURL(/\/auth\/login/i);
}

test('vehicles feature OFF: UI hidden + API returns 403 for instructor', async ({ page }) => {
  const seen: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/admin/vehicles')) seen.push(r.url());
  });

  await login(page, process.env.INSTRUCTOR_EMAIL!, process.env.INSTRUCTOR_PASSWORD!);

  // UI: instructor não deve ter "Vehicles"
  await expect(page.getByText(/vehicles/i)).toHaveCount(0);

  // API: faz fetch dentro do browser (leva cookies de sessão garantido)
  const status = await page.evaluate(async () => {
    const r = await fetch('/api/admin/vehicles');
    return r.status;
  });

  expect(status).toBe(403);

  // Não queremos requests automáticos a /api/admin/vehicles com feature OFF
  expect(seen.length).toBe(0);
});
