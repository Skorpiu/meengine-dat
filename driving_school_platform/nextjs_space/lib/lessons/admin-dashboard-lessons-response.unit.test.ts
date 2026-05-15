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
    });
  });

  it("returns empty arrays for invalid payload", () => {
    expect(parseAdminDashboardLessonsPayload(null)).toEqual({
      recent: [],
      current: [],
      upcoming: [],
    });
    expect(
      parseAdminDashboardLessonsPayload({ success: true, data: {} }),
    ).toEqual({
      recent: [],
      current: [],
      upcoming: [],
    });
  });
});
