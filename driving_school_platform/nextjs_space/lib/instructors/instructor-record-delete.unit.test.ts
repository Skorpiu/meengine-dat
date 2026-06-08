import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findFirstMock = vi.fn();
  const userDeleteManyMock = vi.fn();
  const paymentCountMock = vi.fn();
  const invitationCountMock = vi.fn();
  const queryRawMock = vi.fn();
  const transactionMock = vi.fn(
    async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $queryRaw: queryRawMock,
        instructor: { findFirst: findFirstMock },
        payment: { count: paymentCountMock },
        userInvitation: { count: invitationCountMock },
        user: { deleteMany: userDeleteManyMock },
      };
      return fn(tx);
    },
  );

  return {
    findFirstMock,
    userDeleteManyMock,
    paymentCountMock,
    invitationCountMock,
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

import { deleteInstructorRecordIfEligible } from "@/lib/instructors/instructor-record-delete";
import { INSTRUCTOR_DELETE_BLOCK_CODE } from "@/lib/instructors/instructor-record-delete-policy";

const eligibleRow = {
  id: "inst-1",
  organizationId: "org-a",
  userId: "user-1",
  user: {
    id: "user-1",
    email: "instructor@school.test",
    role: "INSTRUCTOR" as const,
    organizationId: "org-a",
  },
  _count: {
    lessons: 0,
    exams: 0,
    lessonRequests: 0,
    preferredStudents: 0,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  h.queryRawMock.mockResolvedValue([{ id: "inst-1" }]);
  h.findFirstMock.mockResolvedValue(eligibleRow);
  h.paymentCountMock.mockResolvedValue(0);
  h.invitationCountMock.mockResolvedValue(0);
  h.userDeleteManyMock.mockResolvedValue({ count: 1 });
});

describe("deleteInstructorRecordIfEligible", () => {
  it("deletes User when policy allows (cascade Instructor)", async () => {
    const result = await deleteInstructorRecordIfEligible({
      organizationId: "org-a",
      instructorId: "inst-1",
      currentUserId: "admin-1",
    });

    expect(result).toEqual({ ok: true });
    expect(h.userDeleteManyMock).toHaveBeenCalledWith({
      where: {
        id: "user-1",
        organizationId: "org-a",
        role: "INSTRUCTOR",
      },
    });
    expect(h.queryRawMock.mock.invocationCallOrder[0]).toBeLessThan(
      h.findFirstMock.mock.invocationCallOrder[0],
    );
  });

  it("returns notFound when instructor is missing", async () => {
    h.queryRawMock.mockResolvedValue([]);

    const result = await deleteInstructorRecordIfEligible({
      organizationId: "org-a",
      instructorId: "missing",
      currentUserId: "admin-1",
    });

    expect(result).toEqual({ ok: false, notFound: true });
    expect(h.userDeleteManyMock).not.toHaveBeenCalled();
  });

  it("blocks cross-tenant via lock (no row)", async () => {
    h.queryRawMock.mockResolvedValue([]);

    const result = await deleteInstructorRecordIfEligible({
      organizationId: "org-b",
      instructorId: "inst-1",
      currentUserId: "admin-1",
    });

    expect(result).toEqual({ ok: false, notFound: true });
    expect(h.userDeleteManyMock).not.toHaveBeenCalled();
  });

  it("does not delete when lessons exist", async () => {
    h.findFirstMock.mockResolvedValue({
      ...eligibleRow,
      _count: { ...eligibleRow._count, lessons: 1 },
    });

    const result = await deleteInstructorRecordIfEligible({
      organizationId: "org-a",
      instructorId: "inst-1",
      currentUserId: "admin-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(INSTRUCTOR_DELETE_BLOCK_CODE.HAS_LESSONS);
    }
    expect(h.userDeleteManyMock).not.toHaveBeenCalled();
  });

  it("does not delete when payments exist", async () => {
    h.paymentCountMock.mockResolvedValue(1);

    const result = await deleteInstructorRecordIfEligible({
      organizationId: "org-a",
      instructorId: "inst-1",
      currentUserId: "admin-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(INSTRUCTOR_DELETE_BLOCK_CODE.HAS_PAYMENTS);
    }
    expect(h.userDeleteManyMock).not.toHaveBeenCalled();
  });

  it("does not delete when exams exist", async () => {
    h.findFirstMock.mockResolvedValue({
      ...eligibleRow,
      _count: { ...eligibleRow._count, exams: 1 },
    });

    const result = await deleteInstructorRecordIfEligible({
      organizationId: "org-a",
      instructorId: "inst-1",
      currentUserId: "admin-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(INSTRUCTOR_DELETE_BLOCK_CODE.HAS_EXAMS);
    }
    expect(h.userDeleteManyMock).not.toHaveBeenCalled();
  });

  it("does not delete when lesson requests exist", async () => {
    h.findFirstMock.mockResolvedValue({
      ...eligibleRow,
      _count: { ...eligibleRow._count, lessonRequests: 1 },
    });

    const result = await deleteInstructorRecordIfEligible({
      organizationId: "org-a",
      instructorId: "inst-1",
      currentUserId: "admin-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(
        INSTRUCTOR_DELETE_BLOCK_CODE.HAS_LESSON_REQUESTS,
      );
    }
    expect(h.userDeleteManyMock).not.toHaveBeenCalled();
  });

  it("does not delete when preferred students exist", async () => {
    h.findFirstMock.mockResolvedValue({
      ...eligibleRow,
      _count: { ...eligibleRow._count, preferredStudents: 1 },
    });

    const result = await deleteInstructorRecordIfEligible({
      organizationId: "org-a",
      instructorId: "inst-1",
      currentUserId: "admin-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(
        INSTRUCTOR_DELETE_BLOCK_CODE.HAS_PREFERRED_STUDENTS,
      );
    }
    expect(h.userDeleteManyMock).not.toHaveBeenCalled();
  });

  it("does not delete when pending invitation exists", async () => {
    h.invitationCountMock.mockResolvedValue(1);

    const result = await deleteInstructorRecordIfEligible({
      organizationId: "org-a",
      instructorId: "inst-1",
      currentUserId: "admin-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(
        INSTRUCTOR_DELETE_BLOCK_CODE.HAS_PENDING_INVITATION,
      );
    }
    expect(h.userDeleteManyMock).not.toHaveBeenCalled();
  });

  it("blocks self-delete", async () => {
    const result = await deleteInstructorRecordIfEligible({
      organizationId: "org-a",
      instructorId: "inst-1",
      currentUserId: "user-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(INSTRUCTOR_DELETE_BLOCK_CODE.SELF_NOT_ALLOWED);
    }
    expect(h.userDeleteManyMock).not.toHaveBeenCalled();
  });

  it("blocks inconsistent linked User safely", async () => {
    h.findFirstMock.mockResolvedValue({
      ...eligibleRow,
      user: null,
    });

    const result = await deleteInstructorRecordIfEligible({
      organizationId: "org-a",
      instructorId: "inst-1",
      currentUserId: "admin-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(INSTRUCTOR_DELETE_BLOCK_CODE.NOT_ALLOWED);
    }
    expect(h.userDeleteManyMock).not.toHaveBeenCalled();
  });
});
