import { describe, it, expect } from "vitest";
import {
  mapAdminDashboardLessonsResponse,
  mapLessonCalendarResponse,
  mapLessonListItem,
  type LessonListItem,
} from "./lesson-mappers";

function sampleLesson(id: string): LessonListItem {
  return {
    id,
    student: {
      user: { firstName: "Sam", lastName: "Student" },
    },
    instructor: {
      user: { firstName: "Ian", lastName: "Instructor" },
    },
    vehicle: { registrationNumber: "AA-00-BB" },
    category: { name: "B" },
  } as unknown as LessonListItem;
}

describe("lesson-mappers", () => {
  it("mapLessonListItem preserves nested relations", () => {
    const lesson = sampleLesson("lesson-1");
    const mapped = mapLessonListItem(lesson);

    expect(mapped).toBe(lesson);
    expect(mapped.student?.user?.firstName).toBe("Sam");
    expect(mapped.instructor?.user?.lastName).toBe("Instructor");
    expect(mapped.vehicle?.registrationNumber).toBe("AA-00-BB");
    expect(mapped.category?.name).toBe("B");
  });

  it("mapLessonCalendarResponse returns lessons array wrapper", () => {
    const lesson = sampleLesson("lesson-1");
    const body = mapLessonCalendarResponse([lesson]);

    expect(body).toEqual({ lessons: [lesson] });
    expect(body.lessons[0]?.student?.user).toBeDefined();
    expect(body.lessons[0]?.category?.name).toBe("B");
  });

  it("mapAdminDashboardLessonsResponse keeps recent/current/upcoming", () => {
    const recent = sampleLesson("recent-1");
    const current = sampleLesson("current-1");
    const upcoming = sampleLesson("upcoming-1");

    const body = mapAdminDashboardLessonsResponse({
      recent: [recent],
      current: [current],
      upcoming: [upcoming],
    });

    expect(body.recent).toEqual([recent]);
    expect(body.current).toEqual([current]);
    expect(body.upcoming).toEqual([upcoming]);
    expect(body.recent[0]?.instructor?.user).toBeDefined();
    expect(body.upcoming[0]?.category?.name).toBe("B");
  });
});
