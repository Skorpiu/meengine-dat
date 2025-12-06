import { test, expect } from '@playwright/test';

test('no vehicles API call when feature is OFF (instructor)', async ({ page }) => {
  const seen: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/admin/vehicles')) seen.push(r.url());
  });

  await page.goto(process.env.BASE_URL + '/auth/login');
  await page.getByLabel(/email/i).fill(process.env.INSTRUCTOR_EMAIL!);
  await page.getByLabel(/password/i).fill(process.env.INSTRUCTOR_PASSWORD!);
  await page.getByRole('button', { name: /login/i }).click();

  await expect(page.getByText(/vehicles/i)).toHaveCount(0);
  expect(seen).toHaveLength(0);
});
