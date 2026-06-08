import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const instructorFindFirstMock = vi.fn();
  const lessonCreateMock = vi.fn();
  const studentFindFirstMock = vi.fn();
  const studentFindManyMock = vi.fn();
  const transactionMock = vi.fn();
  const getNextPracticalLessonNumberMock = vi.fn();

  return {
    instructorFindFirstMock,
    lessonCreateMock,
    studentFindFirstMock,
    studentFindManyMock,
    transactionMock,
    getNextPracticalLessonNumberMock,
    prismaMock: {
      instructor: { findFirst: instructorFindFirstMock },
      lesson: { create: lessonCreateMock },
      vehicle: { findFirst: vi.fn() },
      category: { findFirst: vi.fn() },
      student: {
        findFirst: studentFindFirstMock,
        findMany: studentFindManyMock,
      },
      $transaction: transactionMock,
    },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
}));

vi.mock("@/lib/lessons/practical-lesson-counter", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/lib/lessons/practical-lesson-counter")
    >();
  return {
    ...actual,
    getNextPracticalLessonNumber: (...args: unknown[]) =>
      h.getNextPracticalLessonNumberMock(...args),
  };
});

import { createAdminLesson } from "./lesson-create-service";

beforeEach(() => {
  vi.resetAllMocks();
  h.getNextPracticalLessonNumberMock.mockResolvedValue(1);
  h.instructorFindFirstMock.mockResolvedValue({
    id: "inst-1",
    isAvailableForBooking: true,
    qualifiedCategories: [{ id: 1 }],
  });
  h.lessonCreateMock.mockResolvedValue({ id: "lesson-1" });
  h.studentFindFirstMock.mockImplementation(
    async ({ where }: { where?: { id?: string; organizationId?: string } }) => {
      if (where?.id && where?.organizationId === "org-1") {
        return { id: where.id, userId: null };
      }
      return null;
    },
  );
  h.studentFindManyMock.mockImplementation(
    async ({
      where,
    }: {
      where?: { id?: { in?: string[] }; organizationId?: string };
    }) => {
      const ids = where?.id?.in;
      if (where?.organizationId === "org-1" && ids) {
        return ids.map((id) => ({ id }));
      }
      return [];
    },
  );
  h.transactionMock.mockImplementation(async (ops: unknown) => {
    if (Array.isArray(ops)) {
      return Promise.all(ops);
    }
    return ops;
  });
});

describe("createAdminLesson", () => {
  it("returns 400 when EXAM exceeds max students per exam", async () => {
    const result = await createAdminLesson({
      organizationId: "org-1",
      durationMinutes: 60,
      payload: {
        lessonType: "EXAM",
        instructorId: "user-inst",
        studentIds: ["s1", "s2", "s3"],
        lessonDate: "2026-01-06",
        startTime: "10:00",
        endTime: "11:00",
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Maximum/i);
      expect(result.status).toBe(400);
    }
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
    expect(h.transactionMock).not.toHaveBeenCalled();
  });

  it("returns 400 when duration is not positive", async () => {
    const result = await createAdminLesson({
      organizationId: "org-1",
      durationMinutes: 0,
      payload: {
        lessonType: "THEORY",
        instructorId: "user-inst",
        lessonDate: "2026-01-06",
        startTime: "10:00",
        endTime: "10:00",
      },
    });

    expect(result).toEqual({
      ok: false,
      error: "End time must be after start time",
      status: 400,
    });
  });

  it("creates DRIVING lesson for MANUAL_ONLY student (Student.id, no User)", async () => {
    const studentOperationalId = "stu-manual-1";
    h.studentFindFirstMock.mockResolvedValueOnce({
      id: studentOperationalId,
      userId: null,
    });

    const result = await createAdminLesson({
      organizationId: "org-1",
      durationMinutes: 60,
      payload: {
        lessonType: "DRIVING",
        instructorId: "user-inst",
        studentId: studentOperationalId,
        lessonDate: "2026-01-06",
        startTime: "10:00",
        endTime: "11:00",
      },
    });

    expect(result.ok).toBe(true);
    expect(h.studentFindFirstMock).toHaveBeenCalledWith({
      where: { id: studentOperationalId, organizationId: "org-1" },
      select: { id: true },
    });
    expect(h.lessonCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: studentOperationalId,
          practicalLessonNumber: 1,
          lessonSource: "SYSTEM",
        }),
      }),
    );
  });

  it("assigns sequential practicalLessonNumber for DRIVING", async () => {
    h.getNextPracticalLessonNumberMock.mockResolvedValueOnce(4);
    h.studentFindFirstMock.mockResolvedValueOnce({
      id: "stu-seq",
      userId: null,
    });

    await createAdminLesson({
      organizationId: "org-1",
      durationMinutes: 60,
      payload: {
        lessonType: "DRIVING",
        instructorId: "user-inst",
        studentId: "stu-seq",
        lessonDate: "2026-01-06",
        startTime: "10:00",
        endTime: "11:00",
      },
    });

    expect(h.getNextPracticalLessonNumberMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      studentId: "stu-seq",
    });
    expect(h.lessonCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ practicalLessonNumber: 4 }),
      }),
    );
  });

  it("assigns sequential practicalLessonNumber for DRIVING after manual history", async () => {
    h.getNextPracticalLessonNumberMock.mockResolvedValueOnce(6);
    h.studentFindFirstMock.mockResolvedValueOnce({
      id: "stu-seq",
      userId: null,
    });

    await createAdminLesson({
      organizationId: "org-1",
      durationMinutes: 60,
      payload: {
        lessonType: "DRIVING",
        instructorId: "user-inst",
        studentId: "stu-seq",
        lessonDate: "2026-01-06",
        startTime: "10:00",
        endTime: "11:00",
      },
    });

    expect(h.getNextPracticalLessonNumberMock).toHaveBeenCalled();
    expect(h.lessonCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ practicalLessonNumber: 6 }),
      }),
    );
  });

  it("does not assign practicalLessonNumber for THEORY group lesson", async () => {
    const result = await createAdminLesson({
      organizationId: "org-1",
      durationMinutes: 60,
      payload: {
        lessonType: "THEORY",
        instructorId: "user-inst",
        lessonDate: "2026-01-06",
        startTime: "10:00",
        endTime: "11:00",
      },
    });

    expect(result.ok).toBe(true);
    expect(h.getNextPracticalLessonNumberMock).not.toHaveBeenCalled();
    expect(h.lessonCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          practicalLessonNumber: expect.anything(),
        }),
      }),
    );
  });

  it("does not assign practicalLessonNumber for EXAM lessons", async () => {
    await createAdminLesson({
      organizationId: "org-1",
      durationMinutes: 60,
      payload: {
        lessonType: "EXAM",
        instructorId: "user-inst",
        studentIds: ["stu-a"],
        lessonDate: "2026-01-06",
        startTime: "10:00",
        endTime: "11:00",
      },
    });

    expect(h.getNextPracticalLessonNumberMock).not.toHaveBeenCalled();
    expect(h.lessonCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          practicalLessonNumber: expect.anything(),
        }),
      }),
    );
  });

  it("does not assign practicalLessonNumber for THEORY_EXAM lessons", async () => {
    await createAdminLesson({
      organizationId: "org-1",
      durationMinutes: 60,
      payload: {
        lessonType: "THEORY_EXAM",
        instructorId: "user-inst",
        studentIds: ["stu-a"],
        lessonDate: "2026-01-06",
        startTime: "10:00",
        endTime: "11:00",
      },
    });

    expect(h.getNextPracticalLessonNumberMock).not.toHaveBeenCalled();
    expect(h.lessonCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          practicalLessonNumber: expect.anything(),
        }),
      }),
    );
  });

  it("creates DRIVING lesson for APP_USER student (Student.id with linked User)", async () => {
    const studentOperationalId = "stu-app-1";
    h.studentFindFirstMock.mockResolvedValueOnce({
      id: studentOperationalId,
      userId: "user-student-1",
    });

    const result = await createAdminLesson({
      organizationId: "org-1",
      durationMinutes: 60,
      payload: {
        lessonType: "DRIVING",
        instructorId: "user-inst",
        studentId: studentOperationalId,
        lessonDate: "2026-01-06",
        startTime: "10:00",
        endTime: "11:00",
      },
    });

    expect(result.ok).toBe(true);
    expect(h.lessonCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ studentId: studentOperationalId }),
      }),
    );
  });

  it("returns 404 when studentId belongs to another organization", async () => {
    h.studentFindFirstMock.mockResolvedValueOnce(null);

    const result = await createAdminLesson({
      organizationId: "org-1",
      durationMinutes: 60,
      payload: {
        lessonType: "DRIVING",
        instructorId: "user-inst",
        studentId: "stu-other-org",
        lessonDate: "2026-01-06",
        startTime: "10:00",
        endTime: "11:00",
      },
    });

    expect(result).toEqual({
      ok: false,
      error: "Student not found",
      status: 404,
    });
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
  });

  it("creates EXAM lessons after validating all operational Student.id entries", async () => {
    const result = await createAdminLesson({
      organizationId: "org-1",
      durationMinutes: 60,
      payload: {
        lessonType: "EXAM",
        instructorId: "user-inst",
        studentIds: ["stu-a", "stu-b"],
        lessonDate: "2026-01-06",
        startTime: "10:00",
        endTime: "11:00",
      },
    });

    expect(result.ok).toBe(true);
    expect(h.studentFindManyMock).toHaveBeenCalledWith({
      where: {
        id: { in: ["stu-a", "stu-b"] },
        organizationId: "org-1",
      },
      select: { id: true },
    });
    expect(h.transactionMock).toHaveBeenCalledTimes(1);
    expect(h.lessonCreateMock).toHaveBeenCalledTimes(2);
  });

  it("returns 404 for EXAM when any studentId is missing and does not create lessons", async () => {
    h.studentFindManyMock.mockResolvedValueOnce([{ id: "stu-a" }]);

    const result = await createAdminLesson({
      organizationId: "org-1",
      durationMinutes: 60,
      payload: {
        lessonType: "EXAM",
        instructorId: "user-inst",
        studentIds: ["stu-a", "stu-missing"],
        lessonDate: "2026-01-06",
        startTime: "10:00",
        endTime: "11:00",
      },
    });

    expect(result).toEqual({
      ok: false,
      error: "Student not found",
      status: 404,
    });
    expect(h.transactionMock).not.toHaveBeenCalled();
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
  });

  it("returns 404 for THEORY_EXAM when any studentId is missing and does not create lessons", async () => {
    h.studentFindManyMock.mockResolvedValueOnce([{ id: "stu-a" }]);

    const result = await createAdminLesson({
      organizationId: "org-1",
      durationMinutes: 60,
      payload: {
        lessonType: "THEORY_EXAM",
        instructorId: "user-inst",
        studentIds: ["stu-a", "stu-missing"],
        lessonDate: "2026-01-06",
        startTime: "10:00",
        endTime: "11:00",
      },
    });

    expect(result).toEqual({
      ok: false,
      error: "Student not found",
      status: 404,
    });
    expect(h.transactionMock).not.toHaveBeenCalled();
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
  });

  it("returns 409 when instructor is not available for booking", async () => {
    h.instructorFindFirstMock.mockResolvedValueOnce({
      id: "inst-1",
      isAvailableForBooking: false,
      qualifiedCategories: [{ id: 1 }],
    });

    const result = await createAdminLesson({
      organizationId: "org-1",
      durationMinutes: 60,
      payload: {
        lessonType: "DRIVING",
        instructorId: "user-inst",
        studentId: "stu-1",
        lessonDate: "2026-01-06",
        startTime: "10:00",
        endTime: "11:00",
      },
    });

    expect(result).toEqual({
      ok: false,
      error: "instructor_not_available_for_booking",
      status: 409,
    });
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
  });
});
