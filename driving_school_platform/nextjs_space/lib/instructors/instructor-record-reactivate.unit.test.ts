import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findFirstMock = vi.fn();
  const instructorUpdateMock = vi.fn();
  const userUpdateMock = vi.fn();
  const queryRawMock = vi.fn();
  const transactionMock = vi.fn(
    async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $queryRaw: queryRawMock,
        instructor: { findFirst: findFirstMock, update: instructorUpdateMock },
        user: { update: userUpdateMock },
      };
      return fn(tx);
    },
  );

  return {
    findFirstMock,
    instructorUpdateMock,
    userUpdateMock,
    queryRawMock,
    transactionMock,
    prismaMock: { $transaction: transactionMock },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
}));

import { reactivateInstructorRecord } from "@/lib/instructors/instructor-record-reactivate";
import { INSTRUCTOR_REACTIVATE_BLOCK_CODE } from "@/lib/instructors/instructor-record-reactivate-policy";

const inactiveRow = {
  id: "inst-1",
  organizationId: "org-a",
  userId: "user-1",
  isAvailableForBooking: false,
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
  h.findFirstMock.mockResolvedValue(inactiveRow);
  h.instructorUpdateMock.mockResolvedValue(inactiveRow);
  h.userUpdateMock.mockResolvedValue({});
});

describe("reactivateInstructorRecord", () => {
  it("reactivates inactive instructor", async () => {
    const result = await reactivateInstructorRecord({
      organizationId: "org-a",
      instructorId: "inst-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.alreadyActive).toBe(false);
    }
    expect(h.instructorUpdateMock).toHaveBeenCalledWith({
      where: { id: "inst-1" },
      data: { isAvailableForBooking: true },
    });
    expect(h.userUpdateMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { isApproved: true },
    });
  });

  it("is idempotent when already active", async () => {
    h.findFirstMock.mockResolvedValue({
      ...inactiveRow,
      isAvailableForBooking: true,
    });

    const result = await reactivateInstructorRecord({
      organizationId: "org-a",
      instructorId: "inst-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.alreadyActive).toBe(true);
    }
    expect(h.instructorUpdateMock).not.toHaveBeenCalled();
    expect(h.userUpdateMock).not.toHaveBeenCalled();
  });

  it("returns notFound when instructor missing", async () => {
    h.queryRawMock.mockResolvedValue([]);

    const result = await reactivateInstructorRecord({
      organizationId: "org-a",
      instructorId: "missing",
    });

    expect(result).toEqual({ ok: false, notFound: true });
  });

  it("blocks inconsistent linked user", async () => {
    h.findFirstMock.mockResolvedValue({ ...inactiveRow, user: null });

    const result = await reactivateInstructorRecord({
      organizationId: "org-a",
      instructorId: "inst-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(INSTRUCTOR_REACTIVATE_BLOCK_CODE.NOT_ALLOWED);
    }
  });
});
