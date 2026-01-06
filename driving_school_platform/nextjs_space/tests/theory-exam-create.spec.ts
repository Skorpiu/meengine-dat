import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, email: string, password: string) {
  await page.goto('/auth/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /login|sign in/i }).click();
  await expect(page).not.toHaveURL(/\/auth\/login/i);
}

test('admin can create THEORY_EXAM (via browser fetch) -> 201', async ({ page }) => {
  await login(page, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);

  const result = await page.evaluate(async () => {
    const baseDate = new Date().toISOString().slice(0, 10);

    const instructorsRes = await fetch('/api/admin/instructors/all');
    const instructorsJson = await instructorsRes.json();
    const instructorId = instructorsJson.instructors?.[0]?.id ?? instructorsJson?.[0]?.id;

    const usersRes = await fetch('/api/admin/users?role=STUDENT');
    const usersJson = await usersRes.json();
    const studentIds = (usersJson.users ?? []).slice(0, 2).map((u: any) => u.id);

    const r = await fetch('/api/admin/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonType: 'THEORY_EXAM',
        instructorId,
        studentIds,
        lessonDate: baseDate,
        startTime: '10:00',
        endTime: '11:00',
      }),
    });

    return { status: r.status, body: await r.json().catch(() => null) };
  });

  expect(result.status).toBe(201);
  expect(result.body?.success).toBe(true);
});
