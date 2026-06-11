import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findManyMock = vi.fn();
  return {
    findManyMock,
    prismaMock: {
      lesson: { findMany: findManyMock },
    },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
}));

import { getAdminDashboardLessons } from "./lesson-queries";
import {
  ADMIN_DASHBOARD_LESSONS_LIST_LIMIT,
  getAdminDashboardUpcomingHorizonEnd,
} from "./admin-dashboard-lessons-truncation";

function buildFixedTimeWindow() {
  const today = new Date(2026, 5, 11);
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);

  return {
    yesterday,
    today,
    tomorrow,
    currentTime: "10:00",
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  h.findManyMock.mockResolvedValue([]);
});

describe("getAdminDashboardLessons upcoming horizon", () => {
  it("upcoming query uses 7-day horizon end instead of tomorrow", async () => {
    const time = buildFixedTimeWindow();
    const expectedHorizonEnd = getAdminDashboardUpcomingHorizonEnd(time.today);

    await getAdminDashboardLessons({
      organizationId: "org1",
      view: "DRIVING",
      time,
    });

    const upcomingCall = h.findManyMock.mock.calls[2]?.[0];
    expect(upcomingCall?.where?.OR).toEqual([
      { lessonDate: time.today, startTime: { gte: time.currentTime } },
      { lessonDate: { gt: time.today, lte: expectedHorizonEnd } },
    ]);
    expect(expectedHorizonEnd.getTime()).toBeGreaterThan(
      time.tomorrow.getTime(),
    );
  });

  it("upcoming query keeps take limit + 1 truncation pattern", async () => {
    const time = buildFixedTimeWindow();

    await getAdminDashboardLessons({
      organizationId: "org1",
      view: "DRIVING",
      time,
    });

    const upcomingCall = h.findManyMock.mock.calls[2]?.[0];
    expect(upcomingCall?.take).toBe(ADMIN_DASHBOARD_LESSONS_LIST_LIMIT + 1);
  });

  it("upcomingHasMore is true when more than 50 upcoming lessons exist", async () => {
    const time = buildFixedTimeWindow();
    const fixture = { id: "lesson-1" };
    const overLimitRows = Array.from({ length: 51 }, (_, index) => ({
      ...fixture,
      id: `lesson-${index}`,
    }));

    h.findManyMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(overLimitRows);

    const result = await getAdminDashboardLessons({
      organizationId: "org1",
      view: "DRIVING",
      time,
    });

    expect(result.upcoming).toHaveLength(ADMIN_DASHBOARD_LESSONS_LIST_LIMIT);
    expect(result.upcomingHasMore).toBe(true);
  });

  it("EXAMS view upcoming query uses the same 7-day horizon", async () => {
    const time = buildFixedTimeWindow();
    const expectedHorizonEnd = getAdminDashboardUpcomingHorizonEnd(time.today);

    await getAdminDashboardLessons({
      organizationId: "org1",
      view: "EXAMS",
      time,
    });

    const upcomingCall = h.findManyMock.mock.calls[2]?.[0];
    expect(upcomingCall?.where?.OR).toEqual([
      { lessonDate: time.today, startTime: { gte: time.currentTime } },
      { lessonDate: { gt: time.today, lte: expectedHorizonEnd } },
    ]);
  });
});
