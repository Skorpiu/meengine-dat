/**
 * Pure response-body mappers for lesson list/calendar GET endpoints.
 * No HTTP, auth, or Prisma — callers pass query results from lesson-queries.
 */
import type { Prisma } from "@prisma/client";
import { LESSON_LIST_SELECT } from "@/lib/lessons/lesson-queries";

export type LessonListItem = Prisma.LessonGetPayload<{
  select: typeof LESSON_LIST_SELECT;
}>;

/** Preserves full lesson graph for list/calendar payloads (no field stripping). */
export function mapLessonListItem(lesson: LessonListItem): LessonListItem {
  return lesson;
}

export type LessonCalendarBody = {
  lessons: LessonListItem[];
};

/** Admin / instructor / student calendar GET body: `{ lessons }`. */
export function mapLessonCalendarResponse(
  lessons: LessonListItem[],
): LessonCalendarBody {
  return {
    lessons: lessons.map(mapLessonListItem),
  };
}

export type AdminDashboardLessonsBody = {
  recent: LessonListItem[];
  current: LessonListItem[];
  upcoming: LessonListItem[];
};

/** Admin dashboard GET data passed to `successResponse` (before `{ success, data }` envelope). */
export function mapAdminDashboardLessonsResponse(
  input: AdminDashboardLessonsBody,
): AdminDashboardLessonsBody {
  return {
    recent: input.recent.map(mapLessonListItem),
    current: input.current.map(mapLessonListItem),
    upcoming: input.upcoming.map(mapLessonListItem),
  };
}

/** Instructor calendar GET — same public shape as admin calendar. */
export const mapInstructorLessonsResponse = mapLessonCalendarResponse;

/** Student calendar GET — same public shape as admin calendar. */
export const mapStudentLessonsResponse = mapLessonCalendarResponse;
