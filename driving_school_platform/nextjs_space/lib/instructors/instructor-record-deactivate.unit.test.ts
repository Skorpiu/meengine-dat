import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findFirstMock = vi.fn();
  const instructorUpdateMock = vi.fn();
  const userUpdateMock = vi.fn();
  const sessionDeleteManyMock = vi.fn();
  const invitationUpdateManyMock = vi.fn();
  const lessonCountMock = vi.fn();
  const queryRawMock = vi.fn();
  const transactionMock = vi.fn(
    async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $queryRaw: queryRawMock,
        instructor: { findFirst: findFirstMock, update: instructorUpdateMock },
        user: { update: userUpdateMock },
        session: { deleteMany: sessionDeleteManyMock },
        userInvitation: { updateMany: invitationUpdateManyMock },
        lesson: { count: lessonCountMock },
      };
      return fn(tx);
    },
  );

  return {
    findFirstMock,
    instructorUpdateMock,
    userUpdateMock,
    sessionDeleteManyMock,
    invitationUpdateManyMock,
    lessonCountMock,
    queryRawMock,
    transactionMock,
    prismaMock: { $transaction: transactionMock },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
}));

import { deactivateInstructorRecord } from "@/lib/instructors/instructor-record-deactivate";
import { INSTRUCTOR_DEACTIVATE_BLOCK_CODE } from "@/lib/instructors/instructor-record-deactivate-policy";

const activeRow = {
  id: "inst-1",
  organizationId: "org-a",
  userId: "user-1",
  isAvailableForBooking: true,
  user: {
    id: "user-1",
    email: "instructor@school.test",
    role: "INSTRUCTOR" as const,
    organizationId: "org-a",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  h.queryRawMock.mockResolvedValue([{ id: "inst-1" }]);
  h.findFirstMock.mockResolvedValue(activeRow);
  h.lessonCountMock.mockResolvedValue(0);
  h.instructorUpdateMock.mockResolvedValue(activeRow);
  h.userUpdateMock.mockResolvedValue({});
  h.sessionDeleteManyMock.mockResolvedValue({ count: 1 });
  h.invitationUpdateManyMock.mockResolvedValue({ count: 0 });
});

describe("deactivateInstructorRecord", () => {
  it("deactivates active instructor", async () => {
    const result = await deactivateInstructorRecord({
      organizationId: "org-a",
      instructorId: "inst-1",
      currentUserId: "admin-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.alreadyInactive).toBe(false);
      expect(result.warningCodes).toEqual([]);
    }
    expect(h.instructorUpdateMock).toHaveBeenCalledWith({
      where: { id: "inst-1" },
      data: { isAvailableForBooking: false },
    });
    expect(h.userUpdateMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        isApproved: false,
        authSessionVersion: { increment: 1 },
      },
    });
    expect(h.sessionDeleteManyMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });

  it("is idempotent when already inactive", async () => {
    h.findFirstMock.mockResolvedValue({
      ...activeRow,
      isAvailableForBooking: false,
    });

    const result = await deactivateInstructorRecord({
      organizationId: "org-a",
      instructorId: "inst-1",
      currentUserId: "admin-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.alreadyInactive).toBe(true);
    }
    expect(h.instructorUpdateMock).not.toHaveBeenCalled();
    expect(h.userUpdateMock).not.toHaveBeenCalled();
  });

  it("returns warning for future scheduled lessons without blocking", async () => {
    h.lessonCountMock.mockResolvedValue(3);

    const result = await deactivateInstructorRecord({
      organizationId: "org-a",
      instructorId: "inst-1",
      currentUserId: "admin-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.futureLessonsCount).toBe(3);
      expect(result.warningCodes).toContain("instructor_has_future_lessons");
    }
    expect(h.instructorUpdateMock).toHaveBeenCalled();
  });

  it("blocks self-deactivate", async () => {
    const result = await deactivateInstructorRecord({
      organizationId: "org-a",
      instructorId: "inst-1",
      currentUserId: "user-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(
        INSTRUCTOR_DEACTIVATE_BLOCK_CODE.SELF_NOT_ALLOWED,
      );
    }
    expect(h.instructorUpdateMock).not.toHaveBeenCalled();
  });

  it("returns notFound when instructor missing", async () => {
    h.queryRawMock.mockResolvedValue([]);

    const result = await deactivateInstructorRecord({
      organizationId: "org-a",
      instructorId: "missing",
      currentUserId: "admin-1",
    });

    expect(result).toEqual({ ok: false, notFound: true });
  });

  it("blocks inconsistent linked user", async () => {
    h.findFirstMock.mockResolvedValue({ ...activeRow, user: null });

    const result = await deactivateInstructorRecord({
      organizationId: "org-a",
      instructorId: "inst-1",
      currentUserId: "admin-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(INSTRUCTOR_DEACTIVATE_BLOCK_CODE.NOT_ALLOWED);
    }
  });
});
