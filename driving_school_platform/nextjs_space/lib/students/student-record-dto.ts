import type { Prisma } from "@prisma/client";
import type { StudentRecordPendingInvitationDto } from "@/lib/students/student-record-ui-types";

const PENDING_STUDENT_INVITATION_SELECT = {
  id: true,
  email: true,
  expiresAt: true,
  status: true,
} satisfies Prisma.UserInvitationSelect;

/** Safe nested User fields for student record API responses. */
export const STUDENT_RECORD_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

/** Nested User fields for lesson-form student list (no email). */
export const STUDENT_RECORD_LESSON_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

/** Minimal Student select for INSTRUCTOR lesson-form list reads. */
export const STUDENT_RECORD_LESSON_SELECT = {
  id: true,
  userId: true,
  firstName: true,
  lastName: true,
  schoolStudentId: true,
  appAccessMode: true,
  user: { select: STUDENT_RECORD_LESSON_USER_SELECT },
} satisfies Prisma.StudentSelect;

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
  userInvitations: {
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: PENDING_STUDENT_INVITATION_SELECT,
  },
} satisfies Prisma.StudentSelect;

export type StudentRecordRow = Prisma.StudentGetPayload<{
  select: typeof STUDENT_RECORD_SELECT;
}>;

export type StudentRecordLessonRow = Prisma.StudentGetPayload<{
  select: typeof STUDENT_RECORD_LESSON_SELECT;
}>;

export type StudentRecordLessonDto = {
  id: string;
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  schoolStudentId: string | null;
  appAccessMode: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
};

export function mapStudentRecordLessonDto(
  row: StudentRecordLessonRow,
): StudentRecordLessonDto {
  return {
    id: row.id,
    userId: row.userId,
    firstName: row.firstName,
    lastName: row.lastName,
    schoolStudentId: row.schoolStudentId,
    appAccessMode: row.appAccessMode,
    user: row.user
      ? {
          id: row.user.id,
          firstName: row.user.firstName,
          lastName: row.user.lastName,
        }
      : null,
  };
}

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
  pendingInvitation: StudentRecordPendingInvitationDto | null;
};

function mapPendingStudentInvitation(
  row: StudentRecordRow,
): StudentRecordPendingInvitationDto | null {
  const pending = row.userInvitations?.[0];
  if (!pending || pending.status !== "PENDING") {
    return null;
  }
  return {
    invitationId: pending.id,
    email: pending.email,
    expiresAt: pending.expiresAt.toISOString(),
    status: "PENDING",
  };
}

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
    pendingInvitation: mapPendingStudentInvitation(row),
  };
}
