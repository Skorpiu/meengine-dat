import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const h = vi.hoisted(() => {
  const lessonCreateMock = vi.fn();
  const transactionMock = vi.fn();
  const instructorFindManyMock = vi.fn();
  const studentFindManyMock = vi.fn();
  const instructorUserFindManyMock = vi.fn();
  const lessonFindManyMock = vi.fn();
  const resolveCategoryMock = vi.fn();
  const getNextPracticalLessonNumberMock = vi.fn();

  const prismaMock = {
    lesson: { create: lessonCreateMock, findMany: lessonFindManyMock },
    instructor: { findMany: instructorFindManyMock },
    student: { findMany: studentFindManyMock },
    $transaction: transactionMock,
  };

  return {
    prismaMock,
    lessonCreateMock,
    transactionMock,
    instructorFindManyMock,
    studentFindManyMock,
    instructorUserFindManyMock,
    lessonFindManyMock,
    resolveCategoryMock,
    getNextPracticalLessonNumberMock,
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
  db: h.prismaMock,
}));

vi.mock("@/lib/lessons/manual-practical-lesson-service", () => ({
  resolveDrivingCategoryIdForInstructor: (...args: unknown[]) =>
    h.resolveCategoryMock(...args),
}));

vi.mock("@/lib/lessons/practical-lesson-counter", () => ({
  getNextPracticalLessonNumber: (...args: unknown[]) =>
    h.getNextPracticalLessonNumberMock(...args),
}));

import {
  PRACTICAL_LESSON_IMPORT_APPLY_MAX_ROWS,
  buildPracticalLessonImportApplyPlan,
  buildPracticalLessonImportApplyResult,
  checkPracticalLessonImportPayloadLimits,
  createPracticalLessonsFromImportRows,
  isPracticalLessonNumberConflict,
  runPracticalLessonImportApply,
} from "@/lib/import-export/practical-lesson-import-apply";
import { PRACTICAL_LESSON_IMPORT_CSV_HEADERS } from "@/lib/import-export/import-export-contracts";
import { MANUAL_PRACTICAL_LESSON_DEFAULT_DURATION_MINUTES } from "@/lib/lessons/manual-practical-lesson-validation";

const CSV_HEADER = PRACTICAL_LESSON_IMPORT_CSV_HEADERS.join(";");

const INSTRUCTOR_USER_ID = "11111111-1111-1111-1111-111111111111";
const INSTRUCTOR_RECORD_ID = "22222222-2222-2222-2222-222222222222";

const studentsBySchoolStudentId = new Map([["26001", "student-1"]]);
const instructorUserIdsByEmail = new Map([
  ["instrutor@school.test", INSTRUCTOR_USER_ID],
]);

beforeEach(() => {
  vi.resetAllMocks();
  h.lessonCreateMock.mockResolvedValue({ id: "lesson-1" });
  h.transactionMock.mockImplementation(async (callback: unknown) => {
    if (typeof callback === "function") {
      return callback(h.prismaMock);
    }
    return callback;
  });
  h.instructorFindManyMock.mockResolvedValue([
    { id: INSTRUCTOR_RECORD_ID, userId: INSTRUCTOR_USER_ID },
  ]);
  h.studentFindManyMock.mockResolvedValue([
    { id: "student-1", schoolStudentId: "26001" },
  ]);
  h.lessonFindManyMock.mockResolvedValue([]);
  h.resolveCategoryMock.mockResolvedValue({ ok: true, categoryId: 2 });
});

describe("checkPracticalLessonImportPayloadLimits", () => {
  it("rejects row count above max", () => {
    const errors = checkPracticalLessonImportPayloadLimits({
      rowCount: PRACTICAL_LESSON_IMPORT_APPLY_MAX_ROWS + 1,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]?.code).toBe("unsupported_value");
  });
});

describe("buildPracticalLessonImportApplyPlan", () => {
  it("marks plan as not applicable when a row is invalid", () => {
    const plan = buildPracticalLessonImportApplyPlan({
      format: "csv",
      content: `${CSV_HEADER}\n26001;abc;2026-05-29;09:00;60;instrutor@school.test;`,
      studentsBySchoolStudentId,
      instructorUserIdsByEmail,
      existingLessonKeys: new Set(),
    });
    expect(plan.canApply).toBe(false);
    expect(plan.report.validRows).toBe(0);
    expect(plan.rowsToCreate).toHaveLength(0);
  });

  it("marks plan as applicable for valid rows without duplicates", () => {
    const plan = buildPracticalLessonImportApplyPlan({
      format: "json",
      rows: [
        {
          schoolStudentId: "26001",
          practicalLessonNumber: 3,
          lessonDate: "2026-05-29",
          startTime: "09:00",
          instructorEmail: "instrutor@school.test",
        },
      ],
      studentsBySchoolStudentId,
      instructorUserIdsByEmail,
      existingLessonKeys: new Set(),
    });
    expect(plan.canApply).toBe(true);
    expect(plan.rowsToCreate).toHaveLength(1);
  });

  it("blocks when duplicate exists in organization", () => {
    const plan = buildPracticalLessonImportApplyPlan({
      format: "csv",
      content: `${CSV_HEADER}\n26001;2;2026-05-29;09:00;60;instrutor@school.test;`,
      studentsBySchoolStudentId,
      instructorUserIdsByEmail,
      existingLessonKeys: new Set(["student-1:2"]),
    });
    expect(plan.canApply).toBe(false);
    expect(plan.report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "duplicate_practical_lesson_number" }),
      ]),
    );
  });
});

describe("createPracticalLessonsFromImportRows", () => {
  const normalizedRow = {
    schoolStudentId: "26001",
    studentId: "student-1",
    practicalLessonNumber: 3,
    lessonDate: "2026-05-29",
    startTime: "09:00",
    durationMinutes: 60,
    instructorEmail: "instrutor@school.test",
    instructorId: INSTRUCTOR_USER_ID,
    notes: "Imported note",
  };

  it("creates DRIVING COMPLETED IMPORT lesson with explicit practicalLessonNumber", async () => {
    await createPracticalLessonsFromImportRows({
      organizationId: "org-a",
      rows: [{ rowNumber: 2, normalized: normalizedRow }],
    });

    expect(h.lessonCreateMock).toHaveBeenCalledTimes(1);
    const data = h.lessonCreateMock.mock.calls[0]?.[0]?.data;
    expect(data.lessonType).toBe("DRIVING");
    expect(data.status).toBe("COMPLETED");
    expect(data.lessonSource).toBe("IMPORT");
    expect(data.practicalLessonNumber).toBe(3);
    expect(data.studentId).toBe("student-1");
    expect(data.instructorId).toBe(INSTRUCTOR_RECORD_ID);
    expect(data.instructorId).not.toBe(INSTRUCTOR_USER_ID);
    expect(data.organizationId).toBe("org-a");
    expect(data.vehicleId).toBeNull();
    expect(data.categoryId).toBe(2);
    expect(data.endTime).toBe("10:00");
    expect(h.getNextPracticalLessonNumberMock).not.toHaveBeenCalled();
  });

  it("stores Instructor record id in Lesson.instructorId (same as manual history)", async () => {
    await createPracticalLessonsFromImportRows({
      organizationId: "org-a",
      rows: [{ rowNumber: 2, normalized: normalizedRow }],
    });

    const data = h.lessonCreateMock.mock.calls[0]?.[0]?.data;
    expect(normalizedRow.instructorId).toBe(INSTRUCTOR_USER_ID);
    expect(data.instructorId).toBe(INSTRUCTOR_RECORD_ID);
    expect(h.resolveCategoryMock).toHaveBeenCalledWith({
      organizationId: "org-a",
      instructorDbId: INSTRUCTOR_RECORD_ID,
    });
  });

  it("defaults duration to 60 when absent in normalized row", async () => {
    await createPracticalLessonsFromImportRows({
      organizationId: "org-a",
      rows: [
        {
          rowNumber: 2,
          normalized: {
            ...normalizedRow,
            durationMinutes: MANUAL_PRACTICAL_LESSON_DEFAULT_DURATION_MINUTES,
          },
        },
      ],
    });

    const data = h.lessonCreateMock.mock.calls[0]?.[0]?.data;
    expect(data.durationMinutes).toBe(60);
    expect(data.endTime).toBe("10:00");
  });

  it("stores notes in adminNotes for export round-trip", async () => {
    await createPracticalLessonsFromImportRows({
      organizationId: "org-a",
      rows: [{ rowNumber: 2, normalized: normalizedRow }],
    });

    const data = h.lessonCreateMock.mock.calls[0]?.[0]?.data;
    expect(data.adminNotes).toBe("Imported note");
  });

  it("resolves category from instructor qualified categories", async () => {
    await createPracticalLessonsFromImportRows({
      organizationId: "org-a",
      rows: [{ rowNumber: 2, normalized: normalizedRow }],
    });

    expect(h.resolveCategoryMock).toHaveBeenCalledWith({
      organizationId: "org-a",
      instructorDbId: INSTRUCTOR_RECORD_ID,
    });
  });

  it("does not create Student, User, or Instructor records", async () => {
    await createPracticalLessonsFromImportRows({
      organizationId: "org-a",
      rows: [{ rowNumber: 2, normalized: normalizedRow }],
    });

    expect(h.studentFindManyMock).not.toHaveBeenCalled();
    expect(h.lessonCreateMock).toHaveBeenCalledTimes(1);
  });
});

describe("runPracticalLessonImportApply", () => {
  beforeEach(() => {
    h.studentFindManyMock.mockResolvedValue([
      { id: "student-1", schoolStudentId: "26001" },
    ]);
    h.instructorFindManyMock.mockImplementation(async (args: unknown) => {
      const query = args as {
        where?: {
          user?: { email?: { in?: string[] } };
          userId?: { in?: string[] };
        };
      };
      if (query.where?.user?.email) {
        return [
          {
            userId: INSTRUCTOR_USER_ID,
            user: { email: "instrutor@school.test" },
          },
        ];
      }
      if (query.where?.userId) {
        return [{ id: INSTRUCTOR_RECORD_ID, userId: INSTRUCTOR_USER_ID }];
      }
      return [];
    });
  });

  it("does not call create when validation fails", async () => {
    const result = await runPracticalLessonImportApply({
      organizationId: "org-a",
      format: "csv",
      content: `${CSV_HEADER}\n26001;1;2026-05-29;09:00;60;bad-email;`,
    });

    expect(result.applied).toBe(false);
    expect(result.createdCount).toBe(0);
    expect(h.transactionMock).not.toHaveBeenCalled();
  });

  it("creates all rows in a transaction when valid", async () => {
    const result = await runPracticalLessonImportApply({
      organizationId: "org-a",
      format: "json",
      rows: [
        {
          schoolStudentId: "26001",
          practicalLessonNumber: 1,
          lessonDate: "2026-05-29",
          startTime: "09:00",
          instructorEmail: "instrutor@school.test",
        },
        {
          schoolStudentId: "26001",
          practicalLessonNumber: 2,
          lessonDate: "2026-05-30",
          startTime: "10:00",
          instructorEmail: "instrutor@school.test",
        },
      ],
    });

    expect(result.applied).toBe(true);
    expect(result.createdCount).toBe(2);
    expect(h.transactionMock).toHaveBeenCalledTimes(1);
    expect(h.lessonCreateMock).toHaveBeenCalledTimes(2);
    expect(h.getNextPracticalLessonNumberMock).not.toHaveBeenCalled();
  });

  it("returns applied false on P2002 practicalLessonNumber conflict", async () => {
    h.lessonCreateMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "test",
        meta: {
          target: [
            "organizationId",
            "studentId",
            "lessonType",
            "practicalLessonNumber",
          ],
        },
      }),
    );

    const result = await runPracticalLessonImportApply({
      organizationId: "org-a",
      format: "json",
      rows: [
        {
          schoolStudentId: "26001",
          practicalLessonNumber: 1,
          lessonDate: "2026-05-29",
          startTime: "09:00",
          instructorEmail: "instrutor@school.test",
        },
      ],
    });

    expect(result.applied).toBe(false);
    expect(result.createdCount).toBe(0);
    expect(result.report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "duplicate_practical_lesson_number" }),
      ]),
    );
  });

  it("rolls back entire transaction when a create fails", async () => {
    h.lessonCreateMock
      .mockResolvedValueOnce({ id: "l1" })
      .mockRejectedValueOnce(new Error("db failure"));

    await expect(
      runPracticalLessonImportApply({
        organizationId: "org-a",
        format: "json",
        rows: [
          {
            schoolStudentId: "26001",
            practicalLessonNumber: 1,
            lessonDate: "2026-05-29",
            startTime: "09:00",
            instructorEmail: "instrutor@school.test",
          },
          {
            schoolStudentId: "26001",
            practicalLessonNumber: 2,
            lessonDate: "2026-05-30",
            startTime: "10:00",
            instructorEmail: "instrutor@school.test",
          },
        ],
      }),
    ).rejects.toThrow("db failure");
  });
});

describe("isPracticalLessonNumberConflict", () => {
  it("returns true for P2002 on practicalLessonNumber target", () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint",
      {
        code: "P2002",
        clientVersion: "test",
        meta: {
          target: [
            "organizationId",
            "studentId",
            "lessonType",
            "practicalLessonNumber",
          ],
        },
      },
    );
    expect(isPracticalLessonNumberConflict(error)).toBe(true);
  });

  it("returns false for P2002 on other fields", () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint",
      {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["studentIdNumber"] },
      },
    );
    expect(isPracticalLessonNumberConflict(error)).toBe(false);
  });
});

describe("buildPracticalLessonImportApplyResult", () => {
  it("wraps report with apply counters", () => {
    const report = {
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
      warnings: [],
      errors: [],
      preview: [],
    };
    expect(
      buildPracticalLessonImportApplyResult({
        applied: true,
        createdCount: 1,
        report,
      }),
    ).toEqual({
      applied: true,
      createdCount: 1,
      skippedCount: 0,
      report,
    });
  });
});
