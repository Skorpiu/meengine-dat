import { expect, type Locator, type Page } from "@playwright/test";
import { assertNoFatalPageErrors } from "./auth";
import { SMOKE_TESTIDS } from "@/lib/smoke/smoke-testids";
import { SCHEDULE_MAP_NARROW_VIEW_HELPER } from "@/lib/schedule/schedule-map-responsive";

/** Subpixel / scrollbar tolerance for horizontal overflow checks. */
export const SMOKE_VIEWPORT_OVERFLOW_TOLERANCE_PX = 8;

export const SMOKE_VIEWPORT_NARROW_PROJECTS = new Set([
  "mobile-chromium",
  "tablet-chromium",
]);

export type SmokeViewportOverflowMetrics = {
  scrollWidth: number;
  clientWidth: number;
  overflowPx: number;
};

export type SmokeAdminVehiclesPageMarkers = {
  vehicleManagementHeading?: boolean;
  allVehiclesButton?: boolean;
  premiumFeatureGate?: boolean;
};

export type SmokeAdminAuditLogsPageMarkers = {
  auditLogsHeading?: boolean;
  auditEventsCard?: boolean;
};

export type SmokeAdminUsersPageMarkers = {
  peoplePageTestId?: boolean;
  studentsTab?: boolean;
  instructorsTab?: boolean;
};

export type SmokeAdminLessonsPageMarkers = {
  lessonManagementTestId?: boolean;
  drivingTabTestId?: boolean;
};

export type SmokeAdminScheduleMapPageMarkers = {
  scheduleMapTestId?: boolean;
  adminDashboardTestId?: boolean;
};

export function summarizeSmokeViewportOverflow(
  metrics: SmokeViewportOverflowMetrics,
  tolerancePx: number = SMOKE_VIEWPORT_OVERFLOW_TOLERANCE_PX,
): { ok: boolean; detail: string } {
  if (metrics.overflowPx <= tolerancePx) {
    return {
      ok: true,
      detail: `No critical horizontal overflow (${metrics.overflowPx}px <= ${tolerancePx}px tolerance)`,
    };
  }
  return {
    ok: false,
    detail: `Critical horizontal overflow: scrollWidth ${metrics.scrollWidth}px vs clientWidth ${metrics.clientWidth}px (${metrics.overflowPx}px)`,
  };
}

export function summarizeSmokeAdminLessonsPageMarkers(
  markers: SmokeAdminLessonsPageMarkers,
): { ok: boolean; detail: string } {
  if (markers.lessonManagementTestId) {
    return {
      ok: true,
      detail: `Admin lessons page loaded (${SMOKE_TESTIDS.lessonManagement})`,
    };
  }
  if (markers.drivingTabTestId) {
    return {
      ok: true,
      detail: `Admin lessons page loaded (${SMOKE_TESTIDS.lessonManagementDrivingTab})`,
    };
  }
  return {
    ok: false,
    detail: `Admin lessons page: required UI marker not found (${SMOKE_TESTIDS.lessonManagement} or ${SMOKE_TESTIDS.lessonManagementDrivingTab})`,
  };
}

export function summarizeSmokeAdminVehiclesPageMarkers(
  markers: SmokeAdminVehiclesPageMarkers,
): { ok: boolean; detail: string } {
  if (markers.vehicleManagementHeading) {
    return {
      ok: true,
      detail: "Admin vehicles page loaded (vehicle_management_heading)",
    };
  }
  if (markers.allVehiclesButton) {
    return {
      ok: true,
      detail: "Admin vehicles page loaded (all_vehicles_button)",
    };
  }
  if (markers.premiumFeatureGate) {
    return {
      ok: true,
      detail: "Admin vehicles page loaded (premium_feature_gate)",
    };
  }
  return {
    ok: false,
    detail:
      "Admin vehicles page: required UI marker not found (vehicle management heading or all vehicles button)",
  };
}

export function summarizeSmokeAdminAuditLogsPageMarkers(
  markers: SmokeAdminAuditLogsPageMarkers,
): { ok: boolean; detail: string } {
  if (markers.auditLogsHeading) {
    return {
      ok: true,
      detail: "Admin audit logs page loaded (audit_logs_heading)",
    };
  }
  if (markers.auditEventsCard) {
    return {
      ok: true,
      detail: "Admin audit logs page loaded (audit_events_card)",
    };
  }
  return {
    ok: false,
    detail:
      "Admin audit logs page: required UI marker not found (audit logs heading or audit events card)",
  };
}

export function summarizeSmokeAdminUsersPageMarkers(
  markers: SmokeAdminUsersPageMarkers,
): { ok: boolean; detail: string } {
  if (markers.peoplePageTestId) {
    return {
      ok: true,
      detail: `Admin users page loaded (${SMOKE_TESTIDS.peoplePage})`,
    };
  }
  if (markers.studentsTab && markers.instructorsTab) {
    return { ok: true, detail: "Admin users page loaded (people_tabs)" };
  }
  return {
    ok: false,
    detail: `Admin users page: required UI marker not found (${SMOKE_TESTIDS.peoplePage} or students/instructors tabs)`,
  };
}

export function summarizeSmokeAdminScheduleMapPageMarkers(
  markers: SmokeAdminScheduleMapPageMarkers,
): { ok: boolean; detail: string } {
  if (markers.scheduleMapTestId) {
    return {
      ok: true,
      detail: `Schedule Map loaded (${SMOKE_TESTIDS.scheduleMap})`,
    };
  }
  if (markers.adminDashboardTestId) {
    return {
      ok: true,
      detail: `Schedule Map loaded (${SMOKE_TESTIDS.adminDashboard})`,
    };
  }
  return {
    ok: false,
    detail: `Schedule Map: required UI marker not found (${SMOKE_TESTIDS.scheduleMap} or ${SMOKE_TESTIDS.adminDashboard})`,
  };
}

async function isLocatorVisible(locator: Locator): Promise<boolean> {
  try {
    return await locator.first().isVisible();
  } catch {
    return false;
  }
}

export async function measureSmokeViewportOverflow(
  page: Page,
): Promise<SmokeViewportOverflowMetrics> {
  return page.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
    const clientWidth = docEl.clientWidth;
    return {
      scrollWidth,
      clientWidth,
      overflowPx: scrollWidth - clientWidth,
    };
  });
}

export async function assertNoCriticalHorizontalOverflow(
  page: Page,
  tolerancePx: number = SMOKE_VIEWPORT_OVERFLOW_TOLERANCE_PX,
): Promise<SmokeViewportOverflowMetrics> {
  const metrics = await measureSmokeViewportOverflow(page);
  const summary = summarizeSmokeViewportOverflow(metrics, tolerancePx);
  expect(summary.ok, summary.detail).toBe(true);
  return metrics;
}

async function collectSmokeAdminLessonsPageMarkers(
  page: Page,
): Promise<SmokeAdminLessonsPageMarkers> {
  return {
    lessonManagementTestId: await isLocatorVisible(
      page.getByTestId(SMOKE_TESTIDS.lessonManagement),
    ),
    drivingTabTestId: await isLocatorVisible(
      page.getByTestId(SMOKE_TESTIDS.lessonManagementDrivingTab),
    ),
  };
}

async function collectSmokeAdminVehiclesPageMarkers(
  page: Page,
): Promise<SmokeAdminVehiclesPageMarkers> {
  return {
    vehicleManagementHeading: await isLocatorVisible(
      page.getByRole("heading", { name: /vehicle management/i }),
    ),
    allVehiclesButton: await isLocatorVisible(
      page.getByRole("button", { name: /all vehicles/i }),
    ),
    premiumFeatureGate: await isLocatorVisible(
      page.getByRole("heading", { name: /premium feature/i }),
    ),
  };
}

async function collectSmokeAdminAuditLogsPageMarkers(
  page: Page,
): Promise<SmokeAdminAuditLogsPageMarkers> {
  return {
    auditLogsHeading: await isLocatorVisible(
      page.getByRole("heading", { name: /audit logs/i }),
    ),
    auditEventsCard: await isLocatorVisible(
      page.getByRole("heading", { name: /audit events/i }),
    ),
  };
}

async function collectSmokeAdminUsersPageMarkers(
  page: Page,
): Promise<SmokeAdminUsersPageMarkers> {
  return {
    peoplePageTestId: await isLocatorVisible(
      page.getByTestId(SMOKE_TESTIDS.peoplePage),
    ),
    studentsTab: await isLocatorVisible(
      page.getByRole("tab", { name: /^students$/i }),
    ),
    instructorsTab: await isLocatorVisible(
      page.getByRole("tab", { name: /^instructors$/i }),
    ),
  };
}

async function collectSmokeAdminScheduleMapPageMarkers(
  page: Page,
): Promise<SmokeAdminScheduleMapPageMarkers> {
  return {
    scheduleMapTestId: await isLocatorVisible(
      page.getByTestId(SMOKE_TESTIDS.scheduleMap),
    ),
    adminDashboardTestId: await isLocatorVisible(
      page.getByTestId(SMOKE_TESTIDS.adminDashboard),
    ),
  };
}

export type SmokeViewportAdminPageLoadResult = {
  ok: boolean;
  detail: string;
  overflowPx: number;
};

async function assertSmokeAdminPageViewportLoad(
  page: Page,
  path: string,
  urlPattern: RegExp,
  collectMarkers: (page: Page) => Promise<Record<string, boolean | undefined>>,
  summarizeMarkers: (markers: Record<string, boolean | undefined>) => {
    ok: boolean;
    detail: string;
  },
): Promise<SmokeViewportAdminPageLoadResult> {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page).not.toHaveURL(/\/auth\/login(?:\?|$)/i, {
    timeout: 15_000,
  });
  await expect(page).toHaveURL(urlPattern, { timeout: 15_000 });
  await assertNoFatalPageErrors(page);

  const metrics = await assertNoCriticalHorizontalOverflow(page);
  const markers = await collectMarkers(page);
  const markerSummary = summarizeMarkers(markers);
  expect(markerSummary.ok, markerSummary.detail).toBe(true);

  return {
    ok: markerSummary.ok,
    detail: markerSummary.detail,
    overflowPx: metrics.overflowPx,
  };
}

export async function assertSmokeAdminLessonsPageViewportLoad(
  page: Page,
): Promise<SmokeViewportAdminPageLoadResult> {
  return assertSmokeAdminPageViewportLoad(
    page,
    "/admin/lessons",
    /\/admin\/lessons(?:\/|$|\?)/i,
    collectSmokeAdminLessonsPageMarkers,
    summarizeSmokeAdminLessonsPageMarkers,
  );
}

export async function assertSmokeAdminVehiclesPageViewportLoad(
  page: Page,
): Promise<SmokeViewportAdminPageLoadResult> {
  return assertSmokeAdminPageViewportLoad(
    page,
    "/admin/vehicles",
    /\/admin\/vehicles(?:\/|$|\?)/i,
    collectSmokeAdminVehiclesPageMarkers,
    summarizeSmokeAdminVehiclesPageMarkers,
  );
}

export async function assertSmokeAdminAuditLogsPageViewportLoad(
  page: Page,
): Promise<SmokeViewportAdminPageLoadResult> {
  return assertSmokeAdminPageViewportLoad(
    page,
    "/admin/audit-logs",
    /\/admin\/audit-logs(?:\/|$|\?)/i,
    collectSmokeAdminAuditLogsPageMarkers,
    summarizeSmokeAdminAuditLogsPageMarkers,
  );
}

export async function assertSmokeAdminUsersPageViewportLoad(
  page: Page,
): Promise<SmokeViewportAdminPageLoadResult> {
  return assertSmokeAdminPageViewportLoad(
    page,
    "/admin/users",
    /\/admin\/users(?:\/|$|\?)/i,
    collectSmokeAdminUsersPageMarkers,
    summarizeSmokeAdminUsersPageMarkers,
  );
}

export async function assertSmokeAdminScheduleMapPageViewportLoad(
  page: Page,
  projectName: string,
): Promise<SmokeViewportAdminPageLoadResult> {
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await expect(page).not.toHaveURL(/\/auth\/login(?:\?|$)/i, {
    timeout: 15_000,
  });
  await expect(page).toHaveURL(/\/admin(?:\/|$|\?)/i, { timeout: 15_000 });
  await assertNoFatalPageErrors(page);

  const metrics = await assertNoCriticalHorizontalOverflow(page);
  const markers = await collectSmokeAdminScheduleMapPageMarkers(page);
  const markerSummary = summarizeSmokeAdminScheduleMapPageMarkers(markers);
  expect(markerSummary.ok, markerSummary.detail).toBe(true);

  const narrowHelper = page.getByText(SCHEDULE_MAP_NARROW_VIEW_HELPER);
  if (SMOKE_VIEWPORT_NARROW_PROJECTS.has(projectName)) {
    await expect(
      narrowHelper,
      "Schedule Map narrow-screen Day view helper must be visible on mobile/tablet portrait",
    ).toBeVisible();
  } else if (projectName === "desktop-chromium") {
    await expect(
      narrowHelper,
      "Schedule Map narrow-screen Day view helper must be hidden on desktop",
    ).not.toBeVisible();
  }

  return {
    ok: markerSummary.ok,
    detail: markerSummary.detail,
    overflowPx: metrics.overflowPx,
  };
}
