import { HTTP_STATUS, USER_ROLES } from "@/lib/constants";

export type LessonEndTimeFields = {
  lessonDate?: string | Date | null;
  endTime?: string | null;
};

export type LessonInstructorOwnershipFields = {
  instructor?: { userId?: string | null } | null;
};

export function isPastLesson(lesson: LessonEndTimeFields): boolean {
  if (!lesson?.lessonDate || !lesson?.endTime) return false;

  const d = new Date(lesson.lessonDate);
  const [h, m] = String(lesson.endTime).split(":").map(Number);
  d.setHours(h || 0, m || 0, 0, 0);

  return d.getTime() < Date.now();
}

export type InstructorLessonAccessDecision =
  | { allowed: true }
  | { allowed: false; error: string; status: number };

export function assertInstructorCanMutateLesson(
  user: { id: string; role?: string | null },
  lesson: LessonInstructorOwnershipFields,
): InstructorLessonAccessDecision {
  if (user.role !== USER_ROLES.INSTRUCTOR) {
    return { allowed: true };
  }

  if (!lesson.instructor?.userId) {
    return {
      allowed: false,
      error: "Forbidden",
      status: HTTP_STATUS.FORBIDDEN,
    };
  }

  if (lesson.instructor.userId !== user.id) {
    return {
      allowed: false,
      error: "Forbidden",
      status: HTTP_STATUS.FORBIDDEN,
    };
  }

  return { allowed: true };
}
