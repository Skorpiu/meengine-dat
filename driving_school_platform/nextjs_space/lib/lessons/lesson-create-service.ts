/**
 * Admin lesson creation orchestration (Prisma only).
 * Callers handle HTTP auth, validation, demo sandbox, and feature gates.
 */
import { prisma } from "@/lib/db";
import { HTTP_STATUS, LESSON_STATUS, VALIDATION_RULES } from "@/lib/constants";
import type { LessonCreationInput } from "@/lib/validation";
import {
  findOperationalStudentInOrg,
  findOperationalStudentsInOrg,
} from "@/lib/students/student-lesson-resolve";
import {
  getNextPracticalLessonNumber,
  shouldAssignPracticalLessonNumber,
} from "@/lib/lessons/practical-lesson-counter";

export type CreateAdminLessonPayload = LessonCreationInput & {
  instructorId: string;
};

export type CreateAdminLessonSuccess =
  | {
      kind: "exam";
      message: string;
      lessons: Awaited<ReturnType<typeof prisma.lesson.create>>[];
    }
  | {
      kind: "theory_group";
      message: string;
      lesson: Awaited<ReturnType<typeof prisma.lesson.create>>;
    }
  | {
      kind: "single";
      message: string;
      lesson: Awaited<ReturnType<typeof prisma.lesson.create>>;
    };

export type CreateAdminLessonResult =
  | { ok: true; data: CreateAdminLessonSuccess }
  | { ok: false; error: string; status: number };

export async function createAdminLesson(input: {
  organizationId: string;
  payload: CreateAdminLessonPayload;
  durationMinutes: number;
}): Promise<CreateAdminLessonResult> {
  const { organizationId: orgId, payload, durationMinutes } = input;
  const {
    lessonType,
    studentId,
    studentIds,
    vehicleId,
    lessonDate,
    startTime,
    endTime,
  } = payload;
  const instructorId = payload.instructorId;

  if (durationMinutes <= 0) {
    return {
      ok: false,
      error: "End time must be after start time",
      status: HTTP_STATUS.BAD_REQUEST,
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

  const instructor = await prisma.instructor.findFirst({
    where: { userId: instructorId, organizationId: orgId },
    include: { qualifiedCategories: true },
  });

  if (!instructor) {
    return {
      ok: false,
      error: "Instructor not found",
      status: HTTP_STATUS.NOT_FOUND,
    };
  }

  let categoryId: number;

  if (lessonType === "THEORY") {
    if (instructor.qualifiedCategories.length > 0) {
      categoryId = instructor.qualifiedCategories[0].id;
    } else {
      const defaultCategory = await prisma.category.findFirst({
        where: { name: "B" },
      });

      if (!defaultCategory) {
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

        categoryId = anyCategory.id;
      } else {
        categoryId = defaultCategory.id;
      }
    }
  } else {
    if (instructor.qualifiedCategories.length === 0) {
      return {
        ok: false,
        error:
          "Instructor has no qualified categories for driving lessons. Please assign categories to this instructor first.",
        status: HTTP_STATUS.BAD_REQUEST,
      };
    }

    categoryId = instructor.qualifiedCategories[0].id;
  }

  if (lessonType === "EXAM" || lessonType === "THEORY_EXAM") {
    if (!studentIds || studentIds.length === 0) {
      return {
        ok: false,
        error: `At least one student is required for ${lessonType === "THEORY_EXAM" ? "a theory exam" : "an exam"}`,
        status: HTTP_STATUS.BAD_REQUEST,
      };
    }

    if (
      lessonType === "EXAM" &&
      studentIds.length > VALIDATION_RULES.MAX_STUDENTS_PER_EXAM
    ) {
      return {
        ok: false,
        error: `Maximum ${VALIDATION_RULES.MAX_STUDENTS_PER_EXAM} students per exam`,
        status: HTTP_STATUS.BAD_REQUEST,
      };
    }

    const uniqueStudentIds = [...new Set(studentIds)];
    const foundStudents = await findOperationalStudentsInOrg({
      organizationId: orgId,
      studentIds: uniqueStudentIds,
    });

    if (foundStudents.length !== uniqueStudentIds.length) {
      return {
        ok: false,
        error: "Student not found",
        status: HTTP_STATUS.NOT_FOUND,
      };
    }

    const studentById = new Map(foundStudents.map((s) => [s.id, s]));
    const orderedStudents = uniqueStudentIds.map((id) => studentById.get(id)!);

    const lessons = await prisma.$transaction(
      orderedStudents.map((student) =>
        prisma.lesson.create({
          data: {
            organizationId: orgId,
            studentId: student.id,
            instructorId: instructor.id,
            vehicleId: vehicleId || null,
            lessonDate: new Date(lessonDate),
            startTime,
            endTime,
            durationMinutes,
            lessonType,
            categoryId,
            status: LESSON_STATUS.SCHEDULED,
            lessonSource: "SYSTEM",
          },
        }),
      ),
    );

    return {
      ok: true,
      data: {
        kind: "exam",
        message: `${lessonType === "THEORY_EXAM" ? "Theory exam" : "Exam"} booked successfully for ${lessons.length} student(s)`,
        lessons,
      },
    };
  }

  if (lessonType === "THEORY" && !studentId) {
    const lesson = await prisma.lesson.create({
      data: {
        organizationId: orgId,
        studentId: null,
        instructorId: instructor.id,
        vehicleId: null,
        lessonDate: new Date(lessonDate),
        startTime,
        endTime,
        durationMinutes,
        lessonType,
        categoryId,
        status: LESSON_STATUS.SCHEDULED,
        lessonSource: "SYSTEM",
      },
    });

    return {
      ok: true,
      data: {
        kind: "theory_group",
        message: "Theory group class created successfully",
        lesson,
      },
    };
  }

  if (!studentId) {
    return {
      ok: false,
      error: "Student is required for driving lessons",
      status: HTTP_STATUS.BAD_REQUEST,
    };
  }

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

  const practicalLessonNumber = shouldAssignPracticalLessonNumber(lessonType)
    ? await getNextPracticalLessonNumber({
        organizationId: orgId,
        studentId: student.id,
      })
    : null;

  const lesson = await prisma.lesson.create({
    data: {
      organizationId: orgId,
      studentId: student.id,
      instructorId: instructor.id,
      vehicleId: vehicleId || null,
      lessonDate: new Date(lessonDate),
      startTime,
      endTime,
      durationMinutes,
      lessonType,
      categoryId,
      status: LESSON_STATUS.SCHEDULED,
      lessonSource: "SYSTEM",
      ...(practicalLessonNumber != null ? { practicalLessonNumber } : {}),
    },
  });

  return {
    ok: true,
    data: {
      kind: "single",
      message: "Lesson booked successfully",
      lesson,
    },
  };
}
