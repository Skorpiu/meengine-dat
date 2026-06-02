import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findFirstMock = vi.fn();
  const deleteMock = vi.fn();
  const paymentCountMock = vi.fn();
  const queryRawMock = vi.fn();
  const transactionMock = vi.fn(
    async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $queryRaw: queryRawMock,
        student: { findFirst: findFirstMock, delete: deleteMock },
        payment: { count: paymentCountMock },
      };
      return fn(tx);
    },
  );

  return {
    findFirstMock,
    deleteMock,
    paymentCountMock,
    queryRawMock,
    transactionMock,
    prismaMock: {
      $transaction: transactionMock,
    },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
}));

import { deleteStudentRecordIfEligible } from "@/lib/students/student-record-delete";
import { STUDENT_DELETE_BLOCK_CODE } from "@/lib/students/student-record-delete-policy";

const eligibleRow = {
  id: "stu-1",
  organizationId: "org-a",
  appAccessMode: "MANUAL_ONLY" as const,
  userId: null,
  _count: {
    lessons: 0,
    userInvitations: 0,
    lessonCounters: 0,
    lessonRequests: 0,
    examRegistrations: 0,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  h.queryRawMock.mockResolvedValue([{ id: "stu-1" }]);
  h.findFirstMock.mockResolvedValue(eligibleRow);
  h.paymentCountMock.mockResolvedValue(0);
  h.deleteMock.mockResolvedValue(eligibleRow);
});

describe("deleteStudentRecordIfEligible", () => {
  it("deletes when policy allows", async () => {
    const result = await deleteStudentRecordIfEligible({
      organizationId: "org-a",
      studentId: "stu-1",
    });

    expect(result).toEqual({ ok: true });
    expect(h.queryRawMock).toHaveBeenCalled();
    expect(h.deleteMock).toHaveBeenCalledWith({ where: { id: "stu-1" } });
    expect(h.findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "stu-1", organizationId: "org-a" },
      }),
    );

    // Lock must happen before counts + delete.
    expect(h.queryRawMock.mock.invocationCallOrder[0]).toBeLessThan(
      h.findFirstMock.mock.invocationCallOrder[0],
    );
    expect(h.queryRawMock.mock.invocationCallOrder[0]).toBeLessThan(
      h.deleteMock.mock.invocationCallOrder[0],
    );
  });

  it("returns notFound when student is missing", async () => {
    h.queryRawMock.mockResolvedValue([]);

    const result = await deleteStudentRecordIfEligible({
      organizationId: "org-a",
      studentId: "missing",
    });

    expect(result).toEqual({ ok: false, notFound: true });
    expect(h.deleteMock).not.toHaveBeenCalled();
  });

  it("does not delete when lessons exist", async () => {
    h.findFirstMock.mockResolvedValue({
      ...eligibleRow,
      _count: { ...eligibleRow._count, lessons: 1 },
    });

    const result = await deleteStudentRecordIfEligible({
      organizationId: "org-a",
      studentId: "stu-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(STUDENT_DELETE_BLOCK_CODE.HAS_LESSONS);
    }
    expect(h.deleteMock).not.toHaveBeenCalled();
  });

  it("does not delete when payments exist", async () => {
    h.paymentCountMock.mockResolvedValue(1);

    const result = await deleteStudentRecordIfEligible({
      organizationId: "org-a",
      studentId: "stu-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(STUDENT_DELETE_BLOCK_CODE.HAS_PAYMENTS);
    }
    expect(h.deleteMock).not.toHaveBeenCalled();
  });
});
