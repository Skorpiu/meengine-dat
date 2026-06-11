import { describe, expect, it } from "vitest";
import {
  ADMIN_DASHBOARD_LESSONS_LIST_LIMIT,
  ADMIN_DASHBOARD_UPCOMING_HORIZON_DAYS,
  getAdminDashboardUpcomingHorizonEnd,
  sliceAdminDashboardLessonsWithHasMore,
} from "./admin-dashboard-lessons-truncation";

describe("admin-dashboard-lessons-truncation", () => {
  it("returns all items and hasMore false when within limit", () => {
    const rows = Array.from({ length: 50 }, (_, i) => i);

    expect(sliceAdminDashboardLessonsWithHasMore(rows)).toEqual({
      items: rows,
      hasMore: false,
    });
  });

  it("returns first 50 items and hasMore true when over limit", () => {
    const rows = Array.from({ length: 51 }, (_, i) => i);

    const result = sliceAdminDashboardLessonsWithHasMore(rows);

    expect(result.hasMore).toBe(true);
    expect(result.items).toHaveLength(ADMIN_DASHBOARD_LESSONS_LIST_LIMIT);
    expect(result.items[0]).toBe(0);
    expect(result.items[49]).toBe(49);
  });

  it("uses limit + 1 fetch pattern constant of 50", () => {
    expect(ADMIN_DASHBOARD_LESSONS_LIST_LIMIT).toBe(50);
  });
});

describe("admin-dashboard upcoming horizon", () => {
  it("uses a 7-day horizon constant", () => {
    expect(ADMIN_DASHBOARD_UPCOMING_HORIZON_DAYS).toBe(7);
  });

  it("horizon end is end of day at today + 7 days", () => {
    const today = new Date(2026, 5, 11);
    today.setHours(0, 0, 0, 0);

    const horizonEnd = getAdminDashboardUpcomingHorizonEnd(today);
    const expected = new Date(2026, 5, 18);
    expected.setHours(23, 59, 59, 999);

    expect(horizonEnd.getTime()).toBe(expected.getTime());
  });

  it("lesson on D+3 is within horizon and D+8 is beyond", () => {
    const today = new Date(2026, 5, 11);
    today.setHours(0, 0, 0, 0);
    const horizonEnd = getAdminDashboardUpcomingHorizonEnd(today);

    const d3 = new Date(2026, 5, 14);
    d3.setHours(10, 0, 0, 0);
    const d8 = new Date(2026, 5, 19);
    d8.setHours(10, 0, 0, 0);

    expect(d3.getTime()).toBeGreaterThan(today.getTime());
    expect(d3.getTime()).toBeLessThanOrEqual(horizonEnd.getTime());
    expect(d8.getTime()).toBeGreaterThan(horizonEnd.getTime());
  });
});
