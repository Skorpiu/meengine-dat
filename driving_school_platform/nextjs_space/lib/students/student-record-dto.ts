import type { Prisma } from "@prisma/client";

/** Safe nested User fields for student record API responses. */
export const STUDENT_RECORD_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

export const STUDENT_RECORD_SELECT = {
  id: true,
  userId: true,
  firstName: true,
  lastName: true,
  email: true,
  phoneNumber: true,
  schoolStudentId: true,
  schoolStudentYearSuffix: true,
  schoolStudentSequence: true,
  schoolStudentIdSource: true,
  enrollmentDate: true,
  appAccessMode: true,
  createdAt: true,
  updatedAt: true,
  user: { select: STUDENT_RECORD_USER_SELECT },
} satisfies Prisma.StudentSelect;

export type StudentRecordRow = Prisma.StudentGetPayload<{
  select: typeof STUDENT_RECORD_SELECT;
}>;

export type StudentRecordDto = {
  id: string;
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  schoolStudentId: string | null;
  schoolStudentYearSuffix: string | null;
  schoolStudentSequence: number | null;
  schoolStudentIdSource: string | null;
  enrollmentDate: string | null;
  appAccessMode: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
};

export function mapStudentRecordDto(row: StudentRecordRow): StudentRecordDto {
  return {
    id: row.id,
    userId: row.userId,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phoneNumber: row.phoneNumber,
    schoolStudentId: row.schoolStudentId,
    schoolStudentYearSuffix: row.schoolStudentYearSuffix,
    schoolStudentSequence: row.schoolStudentSequence,
    schoolStudentIdSource: row.schoolStudentIdSource,
    enrollmentDate: row.enrollmentDate?.toISOString() ?? null,
    appAccessMode: row.appAccessMode,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    user: row.user
      ? {
          id: row.user.id,
          email: row.user.email,
          firstName: row.user.firstName,
          lastName: row.user.lastName,
        }
      : null,
  };
}
