import type { Lesson } from "@/lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasData(value: unknown): value is { data: unknown } {
  return isRecord(value) && "data" in value;
}

/** Parse GET /api/admin/lessons/[id] JSON into a Lesson for edit forms. */
export function parseAdminLessonDetailResponse(result: unknown): Lesson | null {
  if (!result) return null;

  const lessonDataUnknown =
    hasData(result) && result.data != null ? result.data : result;

  if (!lessonDataUnknown || !isRecord(lessonDataUnknown)) {
    return null;
  }

  if (typeof lessonDataUnknown.id !== "string" || !lessonDataUnknown.id) {
    return null;
  }

  return lessonDataUnknown as unknown as Lesson;
}

/** Client-side instructor ownership check (mirrors EditLessonClient guard). */
export function isInstructorEditLessonOwner(
  lesson: Lesson,
  userId: string,
): boolean {
  return lesson.instructor?.user?.id === userId;
}
