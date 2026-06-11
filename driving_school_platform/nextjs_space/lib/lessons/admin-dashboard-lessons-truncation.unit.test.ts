import { describe, expect, it } from "vitest";
import {
  ADMIN_DASHBOARD_LESSONS_LIST_LIMIT,
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
