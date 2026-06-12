/**
 * Admin lesson update/delete orchestration (Prisma only).
 * Callers handle HTTP auth, tenant, demo guards, and vehicle feature gates.
 */
import { prisma } from "@/lib/db";
import { HTTP_STATUS, USER_ROLES } from "@/lib/constants";
import type { LessonStatus } from "@prisma/client";
import {
  assertInstructorCanMutateLesson,
  isPastLesson,
} from "@/lib/lessons/lesson-access";
import {
  LESSON_DETAIL_ACCESS_SELECT,
  LESSON_DETAIL_SELECT,
  type LessonDetailItem,
} from "@/lib/lessons/lesson-queries";
import { resolvePracticalLessonNumberOnStudentChange } from "@/lib/lessons/practical-lesson-counter";
import { findOperationalStudentInOrg } from "@/lib/students/student-lesson-resolve";

export type UpdateAdminLessonPayload = {
  lessonDate?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  vehicleId?: number | null;
  /** Instructor User.id — resolved to Instructor.id before persist. */
  instructorId?: string;
  /** Operational Student.id. */
  studentId?: string;
};

type LessonMutationActor = {
  id: string;
  role?: string | null;
};

export type UpdateAdminLessonResult =
  | {
      ok: true;
      lesson: LessonDetailItem;
    }
  | { ok: false; error: string; status: number };

export type DeleteAdminLessonResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export async function updateAdminLesson(input: {
  organizationId: string;
  lessonId: string;
  actor: LessonMutationActor;
  payload: UpdateAdminLessonPayload;
}): Promise<UpdateAdminLessonResult> {
  const { organizationId: orgId, lessonId: id, actor, payload } = input;
  const {
    lessonDate,
    startTime,
    endTime,
    status,
    vehicleId,
    instructorId: instructorUserId,
    studentId,
  } = payload;

  const existingLesson = await prisma.lesson.findFirst({
    where: { id, organizationId: orgId },
    select: LESSON_DETAIL_ACCESS_SELECT,
  });

  if (!existingLesson) {
    return {
      ok: false,
      error: "Lesson not found",
      status: HTTP_STATUS.NOT_FOUND,
    };
  }

  const access = assertInstructorCanMutateLesson(actor, existingLesson);
  if (!access.allowed) {
    return { ok: false, error: access.error, status: access.status };
  }

  if (isPastLesson(existingLesson)) {
    return {
      ok: false,
      error: "Cannot modify a lesson that already ended",
      status: HTTP_STATUS.BAD_REQUEST,
    };
  }

  if (
    actor.role === USER_ROLES.INSTRUCTOR &&
    instructorUserId &&
    instructorUserId !== actor.id
  ) {
    return {
      ok: false,
      error: "Forbidden",
      status: HTTP_STATUS.FORBIDDEN,
    };
  }

  if (vehicleId) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, organizationId: orgId },
      select: { id: true },
    });

    if (!vehicle) {
      return {
        ok: false,
        error: "Vehicle not found",
        status: HTTP_STATUS.NOT_FOUND,
      };
    }
  }

  let resolvedInstructorId: string | undefined;
  if (instructorUserId) {
    const instructor = await prisma.instructor.findFirst({
      where: { userId: instructorUserId, organizationId: orgId },
      select: { id: true, isAvailableForBooking: true },
    });

    if (!instructor) {
      return {
        ok: false,
        error: "Instructor not found",
        status: HTTP_STATUS.NOT_FOUND,
      };
    }

    if (!instructor.isAvailableForBooking) {
      return {
        ok: false,
        error: "instructor_not_available_for_booking",
        status: HTTP_STATUS.CONFLICT,
      };
    }

    resolvedInstructorId = instructor.id;
  }

  let resolvedStudentId: string | undefined;
  if (studentId) {
    const student = await findOperationalStudentInOrg({
      organizationId: orgId,
      studentId,
    });

    if (!student) {
      return {
        ok: false,
        error: "Student not found",
        status: HTTP_STATUS.NOT_FOUND,
      };
    }

    resolvedStudentId = student.id;
  }

  const practicalLessonNumber =
    await resolvePracticalLessonNumberOnStudentChange({
      organizationId: orgId,
      lessonType: existingLesson.lessonType,
      existingStudentId: existingLesson.studentId,
      nextStudentId: resolvedStudentId,
    });

  let durationMinutes: number | undefined;
  if (startTime && endTime) {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    const startInMinutes = startHour * 60 + startMin;
    const endInMinutes = endHour * 60 + endMin;
    durationMinutes = endInMinutes - startInMinutes;

    if (durationMinutes <= 0) {
      return {
        ok: false,
        error: "End time must be after start time",
        status: HTTP_STATUS.BAD_REQUEST,
      };
    }
  }

  const lesson = await prisma.lesson.update({
    where: { id },
    data: {
      ...(lessonDate && { lessonDate: new Date(lessonDate) }),
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
      ...(durationMinutes && { durationMinutes }),
      ...(status && { status: status as LessonStatus }),
      ...(vehicleId !== undefined && { vehicleId: vehicleId || null }),
      ...(resolvedInstructorId !== undefined && {
        instructorId: resolvedInstructorId,
      }),
      ...(resolvedStudentId !== undefined && { studentId: resolvedStudentId }),
      ...(practicalLessonNumber !== undefined && { practicalLessonNumber }),
    },
    select: LESSON_DETAIL_SELECT,
  });

  return { ok: true, lesson };
}

export async function deleteAdminLesson(input: {
  organizationId: string;
  lessonId: string;
  actor: LessonMutationActor;
}): Promise<DeleteAdminLessonResult> {
  const { organizationId: orgId, lessonId: id, actor } = input;

  const lesson = await prisma.lesson.findFirst({
    where: { id, organizationId: orgId },
    select: LESSON_DETAIL_ACCESS_SELECT,
  });

  if (!lesson) {
    return {
      ok: false,
      error: "Lesson not found",
      status: HTTP_STATUS.NOT_FOUND,
    };
  }

  const access = assertInstructorCanMutateLesson(actor, lesson);
  if (!access.allowed) {
    return { ok: false, error: access.error, status: access.status };
  }

  if (isPastLesson(lesson)) {
    return {
      ok: false,
      error: "Cannot delete a lesson that already ended",
      status: HTTP_STATUS.BAD_REQUEST,
    };
  }

  await prisma.lesson.deleteMany({ where: { id, organizationId: orgId } });

  return { ok: true };
}
