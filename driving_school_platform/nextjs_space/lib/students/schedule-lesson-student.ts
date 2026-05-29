import type { Prisma } from "@prisma/client";
import { STUDENT_LESSON_OPERATIONAL_SELECT } from "@/lib/students/student-lesson-select";

export type LessonStudentOperationalPayload = Prisma.StudentGetPayload<{
  select: typeof STUDENT_LESSON_OPERATIONAL_SELECT;
}>;

/** Shape passed to ScheduleMap for student display (with or without linked User). */
export type ScheduleMapStudentPayload = {
  id: string;
  userId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  schoolStudentId?: string | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

export function mapLessonStudentForScheduleMap(
  student: LessonStudentOperationalPayload | null | undefined,
): ScheduleMapStudentPayload | undefined {
  if (!student) return undefined;
  return {
    id: student.id,
    userId: student.userId,
    firstName: student.firstName,
    lastName: student.lastName,
    schoolStudentId: student.schoolStudentId,
    user: student.user
      ? {
          id: student.user.id,
          firstName: student.user.firstName,
          lastName: student.user.lastName,
        }
      : undefined,
  };
}
