import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const h = vi.hoisted(() => {
  const createMock = vi.fn();
  const transactionMock = vi.fn();
  const prismaMock = {
    student: { create: createMock },
    $transaction: transactionMock,
  };
  return { prismaMock, createMock, transactionMock };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
  db: h.prismaMock,
}));

import {
  STUDENT_IMPORT_APPLY_MAX_ROWS,
  buildStudentImportApplyPlan,
  buildStudentImportApplyResult,
  checkStudentImportPayloadLimits,
  createStudentRecordsFromImport,
  runStudentImportApply,
} from "@/lib/import-export/student-record-import-apply";
import { STUDENT_IMPORT_CSV_HEADERS } from "@/lib/import-export/import-export-contracts";

const CSV_HEADER = STUDENT_IMPORT_CSV_HEADERS.join(";");

beforeEach(() => {
  vi.resetAllMocks();
  h.createMock.mockResolvedValue({ id: "student-1" });
  h.transactionMock.mockImplementation(async (callback: unknown) => {
    if (typeof callback === "function") {
      return callback(h.prismaMock);
    }
    return callback;
  });
});

describe("checkStudentImportPayloadLimits", () => {
  it("rejects row count above max", () => {
    const errors = checkStudentImportPayloadLimits({
      rowCount: STUDENT_IMPORT_APPLY_MAX_ROWS + 1,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]?.code).toBe("unsupported_value");
  });
});

describe("buildStudentImportApplyPlan", () => {
  it("marks plan as not applicable when a row is invalid", () => {
    const plan = buildStudentImportApplyPlan({
      format: "csv",
      content: `${CSV_HEADER}\n26001;26;1abc;João;;;`,
      existingSchoolStudentIds: new Set(),
    });
    expect(plan.canApply).toBe(false);
    expect(plan.report.validRows).toBe(0);
    expect(plan.rowsToCreate).toHaveLength(0);
  });

  it("marks plan as applicable for valid rows without duplicates", () => {
    const plan = buildStudentImportApplyPlan({
      format: "json",
      rows: [
        {
          schoolStudentId: "26001",
          yearSuffix: "26",
          sequence: 1,
          firstName: "João",
        },
      ],
      existingSchoolStudentIds: new Set(),
    });
    expect(plan.canApply).toBe(true);
    expect(plan.rowsToCreate).toHaveLength(1);
  });

  it("blocks when duplicate exists in organization", () => {
    const plan = buildStudentImportApplyPlan({
      format: "csv",
      content: `${CSV_HEADER}\n26001;26;1;João;;;`,
      existingSchoolStudentIds: new Set(["26001"]),
    });
    expect(plan.canApply).toBe(false);
    expect(plan.report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "duplicate_school_student_id" }),
      ]),
    );
  });
});

describe("createStudentRecordsFromImport", () => {
  it("creates MANUAL_ONLY IMPORT students with null enrollmentDate when absent", async () => {
    await createStudentRecordsFromImport({
      organizationId: "org-a",
      rows: [
        {
          rowNumber: 2,
          normalized: {
            schoolStudentId: "26001",
            yearSuffix: "26",
            sequence: 1,
            firstName: "João",
            lastName: null,
            phoneNumber: null,
            email: "JOAO@Example.com",
            enrollmentDate: null,
          },
        },
      ],
    });

    expect(h.createMock).toHaveBeenCalledTimes(1);
    const data = h.createMock.mock.calls[0]?.[0]?.data;
    expect(data.userId).toBeNull();
    expect(data.appAccessMode).toBe("MANUAL_ONLY");
    expect(data.schoolStudentIdSource).toBe("IMPORT");
    expect(data.enrollmentDate).toBeNull();
    expect(data.email).toBe("JOAO@Example.com");
    expect(data.studentIdNumber).toBeUndefined();
    expect(data.studentNumber).toBeUndefined();
    expect(data.organizationId).toBe("org-a");
  });

  it("persists enrollmentDate when provided", async () => {
    await createStudentRecordsFromImport({
      organizationId: "org-a",
      rows: [
        {
          rowNumber: 2,
          normalized: {
            schoolStudentId: "26002",
            yearSuffix: "26",
            sequence: 2,
            firstName: "Maria",
            enrollmentDate: "2026-05-29",
          },
        },
      ],
    });

    const data = h.createMock.mock.calls[0]?.[0]?.data;
    expect(data.enrollmentDate).toEqual(new Date("2026-05-29T00:00:00.000Z"));
  });
});

describe("runStudentImportApply", () => {
  it("does not call create when validation fails", async () => {
    const result = await runStudentImportApply({
      organizationId: "org-a",
      format: "csv",
      content: `${CSV_HEADER}\n26001;26;1;;;`,
      existingSchoolStudentIds: new Set(),
    });

    expect(result.applied).toBe(false);
    expect(result.createdCount).toBe(0);
    expect(h.transactionMock).not.toHaveBeenCalled();
  });

  it("creates all rows in a transaction when valid", async () => {
    const result = await runStudentImportApply({
      organizationId: "org-a",
      format: "json",
      rows: [
        {
          schoolStudentId: "26001",
          yearSuffix: "26",
          sequence: 1,
          firstName: "João",
        },
        {
          schoolStudentId: "26002",
          yearSuffix: "26",
          sequence: 2,
          firstName: "Maria",
        },
      ],
      existingSchoolStudentIds: new Set(),
    });

    expect(result.applied).toBe(true);
    expect(result.createdCount).toBe(2);
    expect(h.transactionMock).toHaveBeenCalledTimes(1);
    expect(h.createMock).toHaveBeenCalledTimes(2);
  });

  it("normalizes email to lowercase via dry-run validation before create", async () => {
    await runStudentImportApply({
      organizationId: "org-a",
      format: "json",
      rows: [
        {
          schoolStudentId: "26001",
          yearSuffix: "26",
          sequence: 1,
          firstName: "João",
          email: "JOAO@Example.com",
        },
      ],
      existingSchoolStudentIds: new Set(),
    });

    const data = h.createMock.mock.calls[0]?.[0]?.data;
    expect(data.email).toBe("joao@example.com");
  });

  it("returns applied false on P2002 schoolStudentId conflict", async () => {
    h.createMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["organizationId", "schoolStudentId"] },
      }),
    );

    const result = await runStudentImportApply({
      organizationId: "org-a",
      format: "json",
      rows: [
        {
          schoolStudentId: "26001",
          yearSuffix: "26",
          sequence: 1,
          firstName: "João",
        },
      ],
      existingSchoolStudentIds: new Set(),
    });

    expect(result.applied).toBe(false);
    expect(result.createdCount).toBe(0);
    expect(result.report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "duplicate_school_student_id" }),
      ]),
    );
  });

  it("rolls back entire transaction when a create fails", async () => {
    h.createMock
      .mockResolvedValueOnce({ id: "s1" })
      .mockRejectedValueOnce(new Error("db failure"));

    await expect(
      runStudentImportApply({
        organizationId: "org-a",
        format: "json",
        rows: [
          {
            schoolStudentId: "26001",
            yearSuffix: "26",
            sequence: 1,
            firstName: "João",
          },
          {
            schoolStudentId: "26002",
            yearSuffix: "26",
            sequence: 2,
            firstName: "Maria",
          },
        ],
        existingSchoolStudentIds: new Set(),
      }),
    ).rejects.toThrow("db failure");
  });
});

describe("buildStudentImportApplyResult", () => {
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
      buildStudentImportApplyResult({
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
