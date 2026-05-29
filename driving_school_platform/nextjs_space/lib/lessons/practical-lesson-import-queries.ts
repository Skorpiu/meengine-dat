import { prisma } from "@/lib/db";
import { LESSON_TYPES } from "@/lib/constants";

export async function findStudentsBySchoolStudentIdsInOrg(input: {
  organizationId: string;
  schoolStudentIds: string[];
}): Promise<Map<string, string>> {
  if (input.schoolStudentIds.length === 0) {
    return new Map();
  }

  const rows = await prisma.student.findMany({
    where: {
      organizationId: input.organizationId,
      schoolStudentId: { in: input.schoolStudentIds },
    },
    select: { id: true, schoolStudentId: true },
  });

  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.schoolStudentId) {
      map.set(row.schoolStudentId, row.id);
    }
  }
  return map;
}

export async function findInstructorUserIdsByEmailInOrg(input: {
  organizationId: string;
  emails: string[];
}): Promise<Map<string, string>> {
  if (input.emails.length === 0) {
    return new Map();
  }

  const rows = await prisma.instructor.findMany({
    where: {
      organizationId: input.organizationId,
      user: { email: { in: input.emails } },
    },
    select: {
      userId: true,
      user: { select: { email: true } },
    },
  });

  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.user.email.toLowerCase(), row.userId);
  }
  return map;
}

export type ExistingPracticalLessonKey = {
  studentId: string;
  practicalLessonNumber: number;
};

export async function findExistingPracticalLessonNumbersInOrg(input: {
  organizationId: string;
  studentIds: string[];
}): Promise<ExistingPracticalLessonKey[]> {
  if (input.studentIds.length === 0) {
    return [];
  }

  const rows = await prisma.lesson.findMany({
    where: {
      organizationId: input.organizationId,
      lessonType: LESSON_TYPES.DRIVING,
      studentId: { in: input.studentIds },
      practicalLessonNumber: { not: null },
    },
    select: {
      studentId: true,
      practicalLessonNumber: true,
    },
  });

  return rows
    .filter(
      (row): row is { studentId: string; practicalLessonNumber: number } =>
        row.studentId != null && row.practicalLessonNumber != null,
    )
    .map((row) => ({
      studentId: row.studentId,
      practicalLessonNumber: row.practicalLessonNumber,
    }));
}

export function buildExistingPracticalLessonKeySet(
  rows: ExistingPracticalLessonKey[],
): Set<string> {
  return new Set(
    rows.map((row) => `${row.studentId}:${row.practicalLessonNumber}`),
  );
}
