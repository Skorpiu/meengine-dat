import type { Prisma } from "@prisma/client";

/**
 * Safe User fields for nested lesson API responses (calendar, dashboard, detail).
 * Matches ScheduleMap / LessonForm usage: display names and user id for filters/forms.
 */
export const LESSON_NESTED_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

/** Nested relation shape for student/instructor on lesson reads. */
export const LESSON_NESTED_USER_RELATION = {
  include: { user: { select: LESSON_NESTED_USER_SELECT } },
} as const;
