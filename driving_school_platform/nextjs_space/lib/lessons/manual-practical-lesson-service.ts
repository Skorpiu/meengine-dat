/**
 * Manual practical lesson history — create and list DRIVING lessons with explicit numbers.
 */
import { prisma } from "@/lib/db";
import { HTTP_STATUS, LESSON_STATUS, LESSON_TYPES } from "@/lib/constants";
import { findOperationalStudentInOrg } from "@/lib/students/student-lesson-resolve";
import {
  addMinutesToTime,
  MANUAL_PRACTICAL_LESSON_DEFAULT_DURATION_MINUTES,
} from "@/lib/lessons/manual-practical-lesson-validation";
import type { Prisma } from "@prisma/client";

export type ManualPracticalLessonListItem = {
  id: string;
  lessonDate: Date;
  startTime: string;
  endTime: string;
  practicalLessonNumber: number | null;
  status: string;
  lessonSource: string;
  instructorName: string;
};

const PRACTICAL_HISTORY_INSTRUCTOR_SELECT = {
  user: { select: { firstName: true, lastName: true } },
} satisfies Prisma.InstructorSelect;

export async function resolveDrivingCategoryIdForInstructor(input: {
  organizationId: string;
  instructorDbId: string;
}): Promise<
  | { ok: true; categoryId: number }
  | { ok: false; error: string; status: number }
> {
  const instructor = await prisma.instructor.findFirst({
    where: {
      id: input.instructorDbId,
      organizationId: input.organizationId,
    },
    include: { qualifiedCategories: true },
  });

  if (!instructor) {
    return {
      ok: false,
      error: "Instructor not found",
      status: HTTP_STATUS.NOT_FOUND,
    };
  }

  if (instructor.qualifiedCategories.length > 0) {
    return { ok: true, categoryId: instructor.qualifiedCategories[0].id };
  }

  const defaultCategory = await prisma.category.findFirst({
    where: { name: "B" },
  });
  if (defaultCategory) {
    return { ok: true, categoryId: defaultCategory.id };
  }

  const anyCategory = await prisma.category.findFirst({
    where: { isActive: true },
  });
  if (!anyCategory) {
    return {
      ok: false,
      error: "No active categories found in the system",
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    };
  }

  return { ok: true, categoryId: anyCategory.id };
}

export async function findInstructorInOrgByUserId(input: {
  organizationId: string;
  instructorUserId: string;
}): Promise<{ id: string } | null> {
  return prisma.instructor.findFirst({
    where: {
      userId: input.instructorUserId,
      organizationId: input.organizationId,
    },
    select: { id: true },
  });
}

export async function hasDuplicatePracticalLessonNumber(input: {
  organizationId: string;
  studentId: string;
  practicalLessonNumber: number;
}): Promise<boolean> {
  const existing = await prisma.lesson.findFirst({
    where: {
      organizationId: input.organizationId,
      studentId: input.studentId,
      lessonType: LESSON_TYPES.DRIVING,
      practicalLessonNumber: input.practicalLessonNumber,
    },
    select: { id: true },
  });
  return existing != null;
}

export async function listStudentPracticalLessons(input: {
  organizationId: string;
  studentId: string;
}): Promise<ManualPracticalLessonListItem[]> {
  const lessons = await prisma.lesson.findMany({
    where: {
      organizationId: input.organizationId,
      studentId: input.studentId,
      lessonType: LESSON_TYPES.DRIVING,
    },
    select: {
      id: true,
      lessonDate: true,
      startTime: true,
      endTime: true,
      practicalLessonNumber: true,
      status: true,
      lessonSource: true,
      instructor: { select: PRACTICAL_HISTORY_INSTRUCTOR_SELECT },
    },
    orderBy: [{ practicalLessonNumber: "asc" }, { lessonDate: "asc" }],
  });

  return lessons.map((lesson) => {
    const user = lesson.instructor.user;
    const instructorName = [user.firstName, user.lastName]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(" ");

    return {
      id: lesson.id,
      lessonDate: lesson.lessonDate,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      practicalLessonNumber: lesson.practicalLessonNumber,
      status: lesson.status,
      lessonSource: lesson.lessonSource,
      instructorName: instructorName || "Instructor",
    };
  });
}

export type ManualPracticalLessonAuditSnapshot = {
  id: string;
  lessonType: string;
  studentId: string;
  instructorId: string;
  vehicleId: number | null;
  lessonSource: string;
  practicalLessonNumber: number | null;
  lessonDate: Date;
};

export type CreateManualPracticalLessonResult =
  | {
      ok: true;
      lesson: ManualPracticalLessonListItem;
      auditSnapshot: ManualPracticalLessonAuditSnapshot;
    }
  | { ok: false; error: string; code?: string; status: number };

export type CreateManualPracticalLessonInput = {
  lessonDate: string;
  startTime: string;
  instructorId: string;
  practicalLessonNumber: number;
  durationMinutes?: number;
  notes?: string;
};

export async function createManualPracticalLesson(input: {
  organizationId: string;
  studentId: string;
  body: CreateManualPracticalLessonInput;
}): Promise<CreateManualPracticalLessonResult> {
  const { organizationId, studentId, body } = input;

  const student = await findOperationalStudentInOrg({
    organizationId,
    studentId,
  });
  if (!student) {
    return {
      ok: false,
      error: "Student not found",
      status: HTTP_STATUS.NOT_FOUND,
    };
  }

  const instructor = await findInstructorInOrgByUserId({
    organizationId,
    instructorUserId: body.instructorId,
  });
  if (!instructor) {
    return {
      ok: false,
      error: "Instructor not found",
      status: HTTP_STATUS.NOT_FOUND,
    };
  }

  const duplicate = await hasDuplicatePracticalLessonNumber({
    organizationId,
    studentId: student.id,
    practicalLessonNumber: body.practicalLessonNumber,
  });
  if (duplicate) {
    return {
      ok: false,
      error: "practical_lesson_number_already_exists",
      code: "practical_lesson_number_already_exists",
      status: HTTP_STATUS.CONFLICT,
    };
  }

  const category = await resolveDrivingCategoryIdForInstructor({
    organizationId,
    instructorDbId: instructor.id,
  });
  if (!category.ok) {
    return {
      ok: false,
      error: category.error,
      status: category.status,
    };
  }

  const durationMinutes =
    body.durationMinutes ?? MANUAL_PRACTICAL_LESSON_DEFAULT_DURATION_MINUTES;
  const endTime = addMinutesToTime(body.startTime, durationMinutes);

  const created = await prisma.lesson.create({
    data: {
      organizationId,
      studentId: student.id,
      instructorId: instructor.id,
      vehicleId: null,
      lessonDate: new Date(body.lessonDate),
      startTime: body.startTime,
      endTime,
      durationMinutes,
      lessonType: LESSON_TYPES.DRIVING,
      categoryId: category.categoryId,
      status: LESSON_STATUS.COMPLETED,
      practicalLessonNumber: body.practicalLessonNumber,
      lessonSource: "MANUAL",
      adminNotes: body.notes?.trim() || null,
      completedAt: new Date(body.lessonDate),
    },
    select: {
      id: true,
      lessonType: true,
      studentId: true,
      instructorId: true,
      vehicleId: true,
      lessonDate: true,
      startTime: true,
      endTime: true,
      practicalLessonNumber: true,
      status: true,
      lessonSource: true,
      instructor: { select: PRACTICAL_HISTORY_INSTRUCTOR_SELECT },
    },
  });

  const user = created.instructor.user;
  const instructorName = [user.firstName, user.lastName]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(" ");

  return {
    ok: true,
    lesson: {
      id: created.id,
      lessonDate: created.lessonDate,
      startTime: created.startTime,
      endTime: created.endTime,
      practicalLessonNumber: created.practicalLessonNumber,
      status: created.status,
      lessonSource: created.lessonSource,
      instructorName: instructorName || "Instructor",
    },
    auditSnapshot: {
      id: created.id,
      lessonType: created.lessonType,
      studentId: created.studentId!,
      instructorId: created.instructorId,
      vehicleId: created.vehicleId,
      lessonSource: created.lessonSource,
      practicalLessonNumber: created.practicalLessonNumber,
      lessonDate: created.lessonDate,
    },
  };
}
