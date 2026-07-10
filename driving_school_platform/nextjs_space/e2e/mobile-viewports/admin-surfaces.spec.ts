import { test, expect } from "@playwright/test";
import { assertSmokeTargetAllowed } from "../helpers/env-guards";
import { loginWithCredentials } from "../helpers/auth";
import {
  assertSmokeAdminAuditLogsPageViewportLoad,
  assertSmokeAdminLessonsPageViewportLoad,
  assertSmokeAdminScheduleMapPageViewportLoad,
  assertSmokeAdminUsersPageViewportLoad,
  assertSmokeAdminVehiclesPageViewportLoad,
} from "../helpers/smoke-viewport-layout";

const adminEmail = process.env.DAT_SMOKE_ADMIN_EMAIL?.trim();
const adminPassword = process.env.DAT_SMOKE_ADMIN_PASSWORD;
const hasAdminCredentials = Boolean(adminEmail && adminPassword);

test.beforeAll(() => {
  assertSmokeTargetAllowed();
});

test.describe("Admin mobile/tablet viewport smoke @mobile-viewport", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasAdminCredentials,
      "Set DAT_SMOKE_ADMIN_EMAIL and DAT_SMOKE_ADMIN_PASSWORD (see docs/ops/production-smoke-e2e.md).",
    );
    await loginWithCredentials(page, adminEmail!, adminPassword!);
  });

  test("Schedule Map loads without critical overflow", async ({
    page,
  }, testInfo) => {
    const result = await assertSmokeAdminScheduleMapPageViewportLoad(
      page,
      testInfo.project.name,
    );
    expect(result.ok, result.detail).toBe(true);
  });

  test("lessons page loads without critical overflow", async ({ page }) => {
    const result = await assertSmokeAdminLessonsPageViewportLoad(page);
    expect(result.ok, result.detail).toBe(true);
  });

  test("vehicles page loads without critical overflow", async ({ page }) => {
    const result = await assertSmokeAdminVehiclesPageViewportLoad(page);
    expect(result.ok, result.detail).toBe(true);
  });

  test("audit logs page loads without critical overflow", async ({ page }) => {
    const result = await assertSmokeAdminAuditLogsPageViewportLoad(page);
    expect(result.ok, result.detail).toBe(true);
  });

  test("users page loads without critical overflow", async ({ page }) => {
    const result = await assertSmokeAdminUsersPageViewportLoad(page);
    expect(result.ok, result.detail).toBe(true);
  });
});
