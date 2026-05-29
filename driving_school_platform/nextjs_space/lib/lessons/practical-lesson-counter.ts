/**
 * Sequential practical lesson number per operational Student (DRIVING only).
 * Calculated server-side on lesson create; not recalculated on the client.
 */
import { prisma } from "@/lib/db";
import { LESSON_TYPES } from "@/lib/constants";
import type { PrismaClient } from "@prisma/client";

type PracticalLessonCounterDb = Pick<PrismaClient, "lesson">;

export type PracticalLessonCounterScope = {
  organizationId: string;
  studentId: string;
};

/** Only DRIVING lessons receive a practical lesson number in this batch. */
export function shouldAssignPracticalLessonNumber(lessonType: string): boolean {
  return lessonType === LESSON_TYPES.DRIVING;
}

/** Count existing DRIVING lessons for the student within the organization. */
export async function countExistingPracticalLessonsForStudent(
  input: PracticalLessonCounterScope,
  db: PracticalLessonCounterDb = prisma,
): Promise<number> {
  return db.lesson.count({
    where: {
      organizationId: input.organizationId,
      studentId: input.studentId,
      lessonType: LESSON_TYPES.DRIVING,
    },
  });
}

async function getMaxAssignedPracticalLessonNumber(
  input: PracticalLessonCounterScope,
  db: PracticalLessonCounterDb,
): Promise<number> {
  const aggregate = await db.lesson.aggregate({
    where: {
      organizationId: input.organizationId,
      studentId: input.studentId,
      lessonType: LESSON_TYPES.DRIVING,
      practicalLessonNumber: { not: null },
    },
    _max: { practicalLessonNumber: true },
  });

  return aggregate._max.practicalLessonNumber ?? 0;
}

/**
 * Next sequential practical lesson number for a student.
 * Uses max(assigned numbers, total DRIVING count) + 1 so legacy rows without
 * practicalLessonNumber still advance the counter conservatively.
 */
export async function getNextPracticalLessonNumber(
  input: PracticalLessonCounterScope,
  db: PracticalLessonCounterDb = prisma,
): Promise<number> {
  const [maxAssigned, drivingCount] = await Promise.all([
    getMaxAssignedPracticalLessonNumber(input, db),
    countExistingPracticalLessonsForStudent(input, db),
  ]);

  return Math.max(maxAssigned, drivingCount) + 1;
}
