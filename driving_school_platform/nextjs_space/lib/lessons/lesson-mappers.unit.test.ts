import { describe, it, expect } from "vitest";
import {
  mapAdminDashboardLessonsResponse,
  mapLessonCalendarResponse,
  mapLessonListItem,
  type LessonListItem,
} from "./lesson-mappers";
import { expectLessonJsonHasNoNestedPasswordHash } from "./lesson-include-safety";
import { sampleLessonListItemFixture } from "./lesson-response-contract-fixtures";
import { expectLessonListItemUiContract } from "./lesson-response-contract";

function sampleLesson(id: string): LessonListItem {
  return {
    ...sampleLessonListItemFixture({ id }),
  } as unknown as LessonListItem;
}

describe("lesson-mappers", () => {
  it("mapLessonListItem preserves nested relations", () => {
    const lesson = sampleLesson("lesson-1");
    const mapped = mapLessonListItem(lesson);

    expect(mapped).toBe(lesson);
    expectLessonListItemUiContract(mapped as Record<string, unknown>);
    expect(mapped.student?.user?.firstName).toBe("Sam");
    expect(mapped.instructor?.user?.lastName).toBe("Instructor");
    expect(mapped.vehicle?.registrationNumber).toBe("AB-12-CD");
    expect(mapped.category?.name).toBe("B");
  });

  it("mapLessonCalendarResponse returns lessons array wrapper", () => {
    const lesson = sampleLesson("lesson-1");
    const body = mapLessonCalendarResponse([lesson]);

    expect(body).toEqual({ lessons: [lesson] });
    expect(body.lessons[0]?.student?.user).toBeDefined();
    expect(body.lessons[0]?.category?.name).toBe("B");
    expectLessonJsonHasNoNestedPasswordHash(body);
  });

  it("mapAdminDashboardLessonsResponse keeps recent/current/upcoming", () => {
    const recent = sampleLesson("recent-1");
    const current = sampleLesson("current-1");
    const upcoming = sampleLesson("upcoming-1");

    const body = mapAdminDashboardLessonsResponse({
      recent: [recent],
      current: [current],
      upcoming: [upcoming],
      recentHasMore: false,
      upcomingHasMore: true,
    });

    expect(body.recent).toEqual([recent]);
    expect(body.current).toEqual([current]);
    expect(body.upcoming).toEqual([upcoming]);
    expect(body.recentHasMore).toBe(false);
    expect(body.upcomingHasMore).toBe(true);
    expect(body.recent[0]?.instructor?.user).toBeDefined();
    expect(body.upcoming[0]?.category?.name).toBe("B");
  });
});
