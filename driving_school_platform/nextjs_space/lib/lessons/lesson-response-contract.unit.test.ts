import { describe, it, expect } from "vitest";
import {
  mapAdminDashboardLessonsResponse,
  mapLessonCalendarResponse,
} from "@/lib/lessons/lesson-mappers";
import { sampleLessonListItemFixture } from "@/lib/lessons/lesson-response-contract-fixtures";
import {
  expectAdminDashboardLessonsResponseContract,
  expectLessonCalendarResponseContract,
  expectLessonListItemUiContract,
} from "@/lib/lessons/lesson-response-contract";

describe("lesson response DTO contract (mapper level)", () => {
  const lesson = sampleLessonListItemFixture();

  it("calendar mapper preserves UI fields and omits passwordHash", () => {
    const body = mapLessonCalendarResponse([lesson as never]);
    expectLessonCalendarResponseContract(body as Record<string, unknown>);
    expectLessonListItemUiContract(body.lessons[0] as Record<string, unknown>);
    expect(
      (body.lessons[0] as { pickupLocation?: string }).pickupLocation,
    ).toBe("Main garage");
    expect(
      (body.lessons[0] as { practicalLessonNumber?: number })
        .practicalLessonNumber,
    ).toBe(3);
  });

  it("dashboard mapper preserves slice arrays and UI fields", () => {
    const data = mapAdminDashboardLessonsResponse({
      recent: [lesson as never],
      current: [],
      upcoming: [],
      recentHasMore: true,
      upcomingHasMore: false,
    });
    const envelope = { success: true, data };
    expectAdminDashboardLessonsResponseContract(
      envelope as Record<string, unknown>,
    );
    expect(data.recent).toHaveLength(1);
    expect(data.current).toEqual([]);
    expect(data.upcoming).toEqual([]);
    expect(data.recentHasMore).toBe(true);
    expect(data.upcomingHasMore).toBe(false);
  });
});
