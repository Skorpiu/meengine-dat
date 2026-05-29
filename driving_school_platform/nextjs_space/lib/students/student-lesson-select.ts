import type { Prisma } from "@prisma/client";
import { LESSON_NESTED_USER_SELECT } from "@/lib/users/user-public-select";

/** Operational + linked User fields for lesson list/detail reads (no passwordHash). */
export const STUDENT_LESSON_OPERATIONAL_SELECT = {
  id: true,
  userId: true,
  firstName: true,
  lastName: true,
  email: true,
  phoneNumber: true,
  schoolStudentId: true,
  schoolStudentYearSuffix: true,
  schoolStudentSequence: true,
  enrollmentDate: true,
  appAccessMode: true,
  user: { select: LESSON_NESTED_USER_SELECT },
} satisfies Prisma.StudentSelect;
