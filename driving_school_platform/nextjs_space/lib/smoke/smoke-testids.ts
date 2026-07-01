/**
 * Stable data-testid values for production smoke E2E (admin surfaces only).
 * Keep names prefixed with `smoke-` to avoid collision with product test suites.
 */

export const SMOKE_TESTIDS = {
  adminDashboard: "smoke-admin-dashboard",
  scheduleMap: "smoke-schedule-map",
  lessonManagement: "smoke-lesson-management",
  lessonManagementDrivingTab: "smoke-lesson-management-driving-tab",
  peoplePage: "smoke-people-page",
} as const;

export type SmokeTestId = (typeof SMOKE_TESTIDS)[keyof typeof SMOKE_TESTIDS];
