import { describe, it, expect } from "vitest";
import { parseAdminDashboardLessonsPayload } from "./admin-dashboard-lessons-response";

describe("parseAdminDashboardLessonsPayload", () => {
  it("reads recent/current/upcoming from successResponse data envelope", () => {
    const payload = {
      success: true,
      data: {
        recent: [{ id: "r1" }],
        current: [{ id: "c1" }],
        upcoming: [{ id: "u1" }],
      },
    };

    expect(parseAdminDashboardLessonsPayload(payload)).toEqual({
      recent: [{ id: "r1" }],
      current: [{ id: "c1" }],
      upcoming: [{ id: "u1" }],
      recentHasMore: false,
      upcomingHasMore: false,
    });
  });

  it("reads recentHasMore and upcomingHasMore when present", () => {
    const payload = {
      success: true,
      data: {
        recent: [{ id: "r1" }],
        current: [],
        upcoming: [{ id: "u1" }],
        recentHasMore: true,
        upcomingHasMore: false,
      },
    };

    expect(parseAdminDashboardLessonsPayload(payload)).toEqual({
      recent: [{ id: "r1" }],
      current: [],
      upcoming: [{ id: "u1" }],
      recentHasMore: true,
      upcomingHasMore: false,
    });
  });

  it("falls back to root slices when data envelope is absent", () => {
    const payload = {
      recent: [{ id: "legacy-r" }],
      current: [],
      upcoming: [{ id: "legacy-u" }],
    };

    expect(parseAdminDashboardLessonsPayload(payload)).toEqual({
      recent: [{ id: "legacy-r" }],
      current: [],
      upcoming: [{ id: "legacy-u" }],
      recentHasMore: false,
      upcomingHasMore: false,
    });
  });

  it("returns empty arrays for invalid payload", () => {
    expect(parseAdminDashboardLessonsPayload(null)).toEqual({
      recent: [],
      current: [],
      upcoming: [],
      recentHasMore: false,
      upcomingHasMore: false,
    });
    expect(
      parseAdminDashboardLessonsPayload({ success: true, data: {} }),
    ).toEqual({
      recent: [],
      current: [],
      upcoming: [],
      recentHasMore: false,
      upcomingHasMore: false,
    });
  });
});
