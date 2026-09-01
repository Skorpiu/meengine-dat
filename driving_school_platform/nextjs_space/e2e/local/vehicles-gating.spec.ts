import { test, expect } from "@playwright/test";

import { loginWithLocalE2eCredentials } from "../helpers/local-e2e-auth";
import { assertLocalBrowserE2eConfig } from "../helpers/local-e2e-guards";
import {
  E2E_FIXTURE_INSTRUCTOR_EMAIL,
  E2E_FIXTURE_INSTRUCTOR_PASSWORD,
} from "@/lib/ops/provision-e2e-fixtures";

test.beforeAll(() => {
  assertLocalBrowserE2eConfig();
});

test("vehicles feature OFF: UI hidden + API returns 403 for instructor", async ({
  page,
}) => {
  const navigationSeen: string[] = [];
  const trackVehiclesRequest = (request: { url: () => string }) => {
    if (request.url().includes("/api/admin/vehicles")) {
      navigationSeen.push(request.url());
    }
  };

  page.on("request", trackVehiclesRequest);

  await loginWithLocalE2eCredentials(
    page,
    E2E_FIXTURE_INSTRUCTOR_EMAIL,
    E2E_FIXTURE_INSTRUCTOR_PASSWORD,
    "INSTRUCTOR",
  );

  await expect(page.getByText(/vehicles/i)).toHaveCount(0);

  page.off("request", trackVehiclesRequest);

  const status = await page.evaluate(async () => {
    const r = await fetch("/api/admin/vehicles");
    return r.status;
  });

  expect(status).toBe(403);
  expect(navigationSeen.length).toBe(0);
});
