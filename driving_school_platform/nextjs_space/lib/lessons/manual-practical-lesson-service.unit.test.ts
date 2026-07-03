import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const studentFindFirstMock = vi.fn();
  const instructorFindFirstMock = vi.fn();
  const lessonFindFirstMock = vi.fn();
  const lessonFindManyMock = vi.fn();
  const lessonCreateMock = vi.fn();
  const categoryFindFirstMock = vi.fn();

  return {
    studentFindFirstMock,
    instructorFindFirstMock,
    lessonFindFirstMock,
    lessonFindManyMock,
    lessonCreateMock,
    categoryFindFirstMock,
    prismaMock: {
      student: { findFirst: studentFindFirstMock },
      instructor: { findFirst: instructorFindFirstMock },
      lesson: {
        findFirst: lessonFindFirstMock,
        findMany: lessonFindManyMock,
        create: lessonCreateMock,
      },
      category: { findFirst: categoryFindFirstMock },
    },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
}));

import {
  createManualPracticalLesson,
  hasDuplicatePracticalLessonNumber,
  listStudentPracticalLessons,
} from "./manual-practical-lesson-service";

beforeEach(() => {
  vi.resetAllMocks();
  h.studentFindFirstMock.mockResolvedValue({ id: "stu-1" });
  h.instructorFindFirstMock.mockResolvedValue({
    id: "inst-db-1",
    qualifiedCategories: [{ id: 2 }],
  });
  h.lessonFindFirstMock.mockResolvedValue(null);
  h.categoryFindFirstMock.mockResolvedValue({ id: 2, name: "B" });
  h.lessonCreateMock.mockResolvedValue({
    id: "lesson-manual-1",
    lessonType: "DRIVING",
    studentId: "stu-1",
    instructorId: "inst-db-1",
    vehicleId: null,
    lessonDate: new Date("2026-01-10T00:00:00.000Z"),
    startTime: "10:00",
    endTime: "11:00",
    practicalLessonNumber: 5,
    status: "COMPLETED",
    lessonSource: "MANUAL",
    instructor: {
      user: { firstName: "Ana", lastName: "Costa" },
    },
  });
  h.lessonFindManyMock.mockResolvedValue([]);
});

describe("createManualPracticalLesson", () => {
  const body = {
    lessonDate: "2026-01-10",
    startTime: "10:00",
    instructorId: "user-inst-1",
    practicalLessonNumber: 5,
    durationMinutes: 60,
  };

  it("creates DRIVING COMPLETED lesson with manual number and MANUAL source", async () => {
    const result = await createManualPracticalLesson({
      organizationId: "org-1",
      studentId: "stu-1",
      body,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lesson.practicalLessonNumber).toBe(5);
      expect(result.lesson.lessonSource).toBe("MANUAL");
      expect(result.lesson.status).toBe("COMPLETED");
      expect(result.auditSnapshot).toEqual({
        id: "lesson-manual-1",
        lessonType: "DRIVING",
        studentId: "stu-1",
        instructorId: "inst-db-1",
        vehicleId: null,
        lessonSource: "MANUAL",
        practicalLessonNumber: 5,
        lessonDate: new Date("2026-01-10T00:00:00.000Z"),
      });
    }

    expect(h.lessonCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lessonType: "DRIVING",
          status: "COMPLETED",
          practicalLessonNumber: 5,
          lessonSource: "MANUAL",
          studentId: "stu-1",
          instructorId: "inst-db-1",
        }),
      }),
    );
  });

  it("validates student scoped by organizationId", async () => {
    h.studentFindFirstMock.mockResolvedValueOnce(null);

    const result = await createManualPracticalLesson({
      organizationId: "org-1",
      studentId: "stu-missing",
      body,
    });

    expect(result).toEqual({
      ok: false,
      error: "Student not found",
      status: 404,
    });
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
  });

  it("validates instructor scoped by organizationId", async () => {
    h.instructorFindFirstMock.mockResolvedValueOnce(null);

    const result = await createManualPracticalLesson({
      organizationId: "org-1",
      studentId: "stu-1",
      body,
    });

    expect(result).toEqual({
      ok: false,
      error: "Instructor not found",
      status: 404,
    });
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
  });

  it("blocks duplicate practicalLessonNumber for same student/org", async () => {
    h.lessonFindFirstMock.mockResolvedValueOnce({ id: "existing" });

    const result = await createManualPracticalLesson({
      organizationId: "org-1",
      studentId: "stu-1",
      body,
    });

    expect(result).toEqual({
      ok: false,
      error: "practical_lesson_number_already_exists",
      code: "practical_lesson_number_already_exists",
      status: 409,
    });
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
  });
});

describe("hasDuplicatePracticalLessonNumber", () => {
  it("queries DRIVING lessons by org, student, and number", async () => {
    await hasDuplicatePracticalLessonNumber({
      organizationId: "org-1",
      studentId: "stu-1",
      practicalLessonNumber: 3,
    });

    expect(h.lessonFindFirstMock).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        studentId: "stu-1",
        lessonType: "DRIVING",
        practicalLessonNumber: 3,
      },
      select: { id: true },
    });
  });
});

describe("listStudentPracticalLessons", () => {
  it("returns mapped list ordered by practicalLessonNumber", async () => {
    h.lessonFindManyMock.mockResolvedValueOnce([
      {
        id: "l1",
        lessonDate: new Date("2026-01-01"),
        startTime: "09:00",
        endTime: "10:00",
        practicalLessonNumber: 1,
        status: "COMPLETED",
        lessonSource: "MANUAL",
        instructor: { user: { firstName: "João", lastName: "Silva" } },
      },
    ]);

    const rows = await listStudentPracticalLessons({
      organizationId: "org-1",
      studentId: "stu-1",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].instructorName).toBe("João Silva");
    expect(h.lessonFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lessonType: "DRIVING",
          studentId: "stu-1",
        }),
        orderBy: [{ practicalLessonNumber: "asc" }, { lessonDate: "asc" }],
      }),
    );
  });
});
