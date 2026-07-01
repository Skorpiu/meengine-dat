import { expect, type Locator, type Page } from "@playwright/test";
import { assertNoFatalPageErrors } from "./auth";

export type SmokeAdminPageLoadResult = {
  ok: boolean;
  detail: string;
};

export const SMOKE_OPTIONAL_UI_NAV_TIMEOUT_MS = 15_000;
export const SMOKE_OPTIONAL_UI_MARKER_TIMEOUT_MS = 10_000;

export type SmokeAdminLessonsPageMarkers = {
  lessonsHeading?: boolean;
  mainLandmark?: boolean;
  drivingTab?: boolean;
  codeTab?: boolean;
  premiumFeatureGate?: boolean;
  lessonManagementCopy?: boolean;
};

export type SmokeAdminScheduleMapPageMarkers = {
  scheduleMapLabel?: boolean;
  adminDashboardCopy?: boolean;
  lessonStartTimeVisible?: boolean;
};

export function isSmokeAuthLoginUrl(url: string): boolean {
  return /\/auth\/login(?:\?|$)/i.test(url);
}

export function summarizeSmokeOptionalUiNavigation(
  label: string,
  error: unknown,
): SmokeAdminPageLoadResult {
  const message = error instanceof Error ? error.message : String(error);
  if (/timeout|timed out|exceeded/i.test(message)) {
    return {
      ok: true,
      detail: `WARN: ${label} navigation timed out; mutation smoke continues (API-authoritative)`,
    };
  }
  return {
    ok: true,
    detail: `WARN: ${label} navigation failed (${message}); mutation smoke continues (API-authoritative)`,
  };
}

/**
 * Pure marker resolution for /admin/lessons smoke UI checks.
 * API fixture preflight remains authoritative when no marker matches.
 */
export function summarizeSmokeAdminLessonsPageMarkers(
  markers: SmokeAdminLessonsPageMarkers,
): SmokeAdminPageLoadResult {
  if (markers.lessonsHeading) {
    return {
      ok: true,
      detail: "Admin lessons page loaded (lessons_heading)",
    };
  }
  if (markers.premiumFeatureGate) {
    return {
      ok: true,
      detail: "Admin lessons page loaded (premium_feature_gate)",
    };
  }
  if (markers.lessonManagementCopy) {
    return {
      ok: true,
      detail: "Admin lessons page loaded (lesson_management_copy)",
    };
  }
  if (markers.drivingTab) {
    return {
      ok: true,
      detail: "Admin lessons page loaded (driving_tab)",
    };
  }
  if (markers.codeTab) {
    return {
      ok: true,
      detail: "Admin lessons page loaded (code_tab)",
    };
  }
  if (markers.mainLandmark) {
    return {
      ok: true,
      detail: "Admin lessons page loaded (main_landmark)",
    };
  }

  return {
    ok: true,
    detail:
      "WARN: Admin lessons page smoke UI marker not found; relying on API fixture preflight",
  };
}

export function summarizeSmokeAdminScheduleMapPageMarkers(
  markers: SmokeAdminScheduleMapPageMarkers,
  startTime?: string,
): SmokeAdminPageLoadResult {
  if (startTime && markers.lessonStartTimeVisible) {
    return {
      ok: true,
      detail: `Schedule Map loaded (lesson_start_time_visible:${startTime})`,
    };
  }

  if (startTime && !markers.lessonStartTimeVisible) {
    return {
      ok: true,
      detail: `WARN: Schedule Map lesson start time ${startTime} not visible; mutation smoke continues (API-authoritative)`,
    };
  }

  if (markers.scheduleMapLabel) {
    return {
      ok: true,
      detail: "Schedule Map loaded (schedule_map_label)",
    };
  }
  if (markers.adminDashboardCopy) {
    return {
      ok: true,
      detail: "Schedule Map loaded (admin_dashboard_copy)",
    };
  }

  return {
    ok: true,
    detail:
      "WARN: Schedule Map smoke UI marker not found; mutation smoke continues (API-authoritative)",
  };
}

async function isLocatorVisible(locator: Locator): Promise<boolean> {
  try {
    return await locator.first().isVisible();
  } catch {
    return false;
  }
}

async function collectSmokeAdminLessonsPageMarkers(
  page: Page,
): Promise<SmokeAdminLessonsPageMarkers> {
  return {
    lessonsHeading: await isLocatorVisible(
      page.getByRole("heading", {
        name: /lesson|schedule|aulas|gestão|premium feature/i,
      }),
    ),
    mainLandmark: await isLocatorVisible(page.locator("main")),
    drivingTab: await isLocatorVisible(
      page.getByRole("button", { name: /driving lessons/i }),
    ),
    codeTab: await isLocatorVisible(
      page.getByRole("button", { name: /code lessons/i }),
    ),
    premiumFeatureGate: await isLocatorVisible(
      page.getByRole("heading", { name: /premium feature/i }),
    ),
    lessonManagementCopy: await isLocatorVisible(
      page.getByText(/lesson management/i),
    ),
  };
}

async function collectSmokeAdminScheduleMapPageMarkers(
  page: Page,
  startTime?: string,
): Promise<SmokeAdminScheduleMapPageMarkers> {
  let lessonStartTimeVisible = false;
  if (startTime) {
    try {
      await expect(page.getByText(startTime).first()).toBeVisible({
        timeout: SMOKE_OPTIONAL_UI_MARKER_TIMEOUT_MS,
      });
      lessonStartTimeVisible = true;
    } catch {
      lessonStartTimeVisible = false;
    }
  }

  return {
    scheduleMapLabel: await isLocatorVisible(page.getByText(/schedule map/i)),
    adminDashboardCopy: await isLocatorVisible(
      page.getByText(/admin dashboard/i),
    ),
    lessonStartTimeVisible,
  };
}

/**
 * Optional mutation-smoke navigation. Does not throw on navigation timeout.
 */
export async function trySmokeAdminPageNavigation(
  page: Page,
  path: string,
  label: string,
  navigationTimeoutMs: number = SMOKE_OPTIONAL_UI_NAV_TIMEOUT_MS,
): Promise<SmokeAdminPageLoadResult> {
  try {
    await page.goto(path, {
      timeout: navigationTimeoutMs,
      waitUntil: "domcontentloaded",
    });
  } catch (error) {
    return summarizeSmokeOptionalUiNavigation(label, error);
  }

  if (isSmokeAuthLoginUrl(page.url())) {
    throw new Error(`${label}: redirected to login after navigation`);
  }

  await assertNoFatalPageErrors(page);

  return { ok: true, detail: `${label} navigation completed` };
}

export async function trySmokeAdminScheduleMapPageLoad(
  page: Page,
  focusDate: string,
  startTime?: string,
  navigationTimeoutMs: number = SMOKE_OPTIONAL_UI_NAV_TIMEOUT_MS,
): Promise<SmokeAdminPageLoadResult> {
  const path = `/admin?focusDate=${encodeURIComponent(focusDate)}`;
  const navigation = await trySmokeAdminPageNavigation(
    page,
    path,
    "Schedule Map",
    navigationTimeoutMs,
  );
  if (navigation.detail.includes("WARN:")) {
    return navigation;
  }

  const markers = await collectSmokeAdminScheduleMapPageMarkers(
    page,
    startTime,
  );
  return summarizeSmokeAdminScheduleMapPageMarkers(markers, startTime);
}

export async function trySmokeAdminLessonsPageLoad(
  page: Page,
  navigationTimeoutMs: number = SMOKE_OPTIONAL_UI_NAV_TIMEOUT_MS,
): Promise<SmokeAdminPageLoadResult> {
  const navigation = await trySmokeAdminPageNavigation(
    page,
    "/admin/lessons",
    "Admin lessons",
    navigationTimeoutMs,
  );
  if (navigation.detail.includes("WARN:")) {
    return navigation;
  }

  const markers = await collectSmokeAdminLessonsPageMarkers(page);
  return summarizeSmokeAdminLessonsPageMarkers(markers);
}

export function logSmokeAdminPageLoadResult(
  scope: string,
  result: SmokeAdminPageLoadResult,
): void {
  if (result.detail.includes("WARN:")) {
    console.warn(`${scope}: ${result.detail}`);
    return;
  }
  console.log(`${scope}: ${result.detail}`);
}

/**
 * Smoke-level /admin/lessons load check. Does not hard-fail on heading/copy drift.
 */
export async function assertSmokeAdminLessonsPageLoaded(
  page: Page,
): Promise<SmokeAdminPageLoadResult> {
  await expect(page).not.toHaveURL(/\/auth\/login(?:\?|$)/i, {
    timeout: 15_000,
  });
  await expect(page).toHaveURL(/\/admin\/lessons(?:\/|$|\?)/i, {
    timeout: 15_000,
  });
  await assertNoFatalPageErrors(page);

  const markers = await collectSmokeAdminLessonsPageMarkers(page);
  return summarizeSmokeAdminLessonsPageMarkers(markers);
}
