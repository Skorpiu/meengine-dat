import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const queryRawMock = vi.fn();
  const studentFindFirstMock = vi.fn();
  const studentUpdateMock = vi.fn();
  const userFindFirstMock = vi.fn();
  const userUpdateMock = vi.fn();
  const sessionDeleteManyMock = vi.fn();
  const passwordResetUpdateManyMock = vi.fn();
  const emailVerificationUpdateManyMock = vi.fn();
  const invitationUpdateManyMock = vi.fn();
  const studentFindFirstAfterMock = vi.fn();

  const transactionMock = vi.fn(
    async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $queryRaw: queryRawMock,
        student: {
          findFirst: studentFindFirstMock,
          update: studentUpdateMock,
        },
        user: {
          findFirst: userFindFirstMock,
          update: userUpdateMock,
        },
        session: { deleteMany: sessionDeleteManyMock },
        passwordResetToken: { updateMany: passwordResetUpdateManyMock },
        emailVerificationToken: { updateMany: emailVerificationUpdateManyMock },
        userInvitation: { updateMany: invitationUpdateManyMock },
      };
      return fn(tx);
    },
  );

  return {
    queryRawMock,
    studentFindFirstMock,
    studentUpdateMock,
    userFindFirstMock,
    userUpdateMock,
    sessionDeleteManyMock,
    passwordResetUpdateManyMock,
    emailVerificationUpdateManyMock,
    invitationUpdateManyMock,
    studentFindFirstAfterMock,
    transactionMock,
    prismaMock: {
      $transaction: transactionMock,
      student: { findFirst: studentFindFirstAfterMock },
    },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
}));

import {
  removeStudentAppAccess,
  resolveStudentEmailAfterAppAccessRemove,
  STUDENT_APP_ACCESS_REMOVE_CODE,
} from "@/lib/students/student-app-access-lifecycle-service";

const appUserRow = {
  id: "stu-1",
  organizationId: "org-a",
  appAccessMode: "APP_USER" as const,
  userId: "user-1",
  email: null as string | null,
};

const linkedUser = {
  id: "user-1",
  email: "student@school.test",
  role: "STUDENT" as const,
  organizationId: "org-a",
};

const updatedStudentRow = {
  id: "stu-1",
  userId: null,
  firstName: "João",
  lastName: "Silva",
  email: "student@school.test",
  phoneNumber: null,
  schoolStudentId: "26001",
  schoolStudentYearSuffix: "26",
  schoolStudentSequence: 1,
  schoolStudentIdSource: "MANUAL",
  enrollmentDate: new Date("2026-05-29T10:00:00.000Z"),
  appAccessMode: "MANUAL_ONLY" as const,
  createdAt: new Date("2026-05-29T10:00:00.000Z"),
  updatedAt: new Date("2026-06-06T10:00:00.000Z"),
  user: null,
  userInvitations: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  h.queryRawMock.mockResolvedValue([{ id: "stu-1" }]);
  h.studentFindFirstMock.mockResolvedValue(appUserRow);
  h.userFindFirstMock.mockResolvedValue(linkedUser);
  h.studentUpdateMock.mockResolvedValue(appUserRow);
  h.sessionDeleteManyMock.mockResolvedValue({ count: 1 });
  h.passwordResetUpdateManyMock.mockResolvedValue({ count: 0 });
  h.emailVerificationUpdateManyMock.mockResolvedValue({ count: 0 });
  h.userUpdateMock.mockResolvedValue(linkedUser);
  h.invitationUpdateManyMock.mockResolvedValue({ count: 1 });
  h.studentFindFirstAfterMock.mockResolvedValue(updatedStudentRow);
});

describe("resolveStudentEmailAfterAppAccessRemove", () => {
  it("copies user email when student email is empty", () => {
    expect(
      resolveStudentEmailAfterAppAccessRemove({
        studentEmail: null,
        userEmail: "a@b.com",
      }),
    ).toBe("a@b.com");
  });

  it("preserves non-empty student email", () => {
    expect(
      resolveStudentEmailAfterAppAccessRemove({
        studentEmail: "ops@school.test",
        userEmail: "login@school.test",
      }),
    ).toBeUndefined();
  });
});

describe("removeStudentAppAccess", () => {
  it("removes app access for APP_USER student", async () => {
    const result = await removeStudentAppAccess({
      organizationId: "org-a",
      studentId: "stu-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.student.appAccessMode).toBe("MANUAL_ONLY");
      expect(result.student.userId).toBeNull();
      expect(result.student.user).toBeNull();
    }

    expect(h.studentUpdateMock).toHaveBeenCalledWith({
      where: { id: "stu-1" },
      data: {
        userId: null,
        appAccessMode: "MANUAL_ONLY",
        email: "student@school.test",
      },
    });
  });

  it("preserves linked user with isApproved=false and invalidates sessions", async () => {
    await removeStudentAppAccess({
      organizationId: "org-a",
      studentId: "stu-1",
    });

    expect(h.sessionDeleteManyMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(h.userUpdateMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({ isApproved: false }),
    });
  });

  it("revokes pending invitations linked to student", async () => {
    await removeStudentAppAccess({
      organizationId: "org-a",
      studentId: "stu-1",
    });

    expect(h.invitationUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentId: "stu-1",
          status: "PENDING",
        }),
        data: expect.objectContaining({ status: "REVOKED" }),
      }),
    );
  });

  it("does not delete student or lessons", async () => {
    await removeStudentAppAccess({
      organizationId: "org-a",
      studentId: "stu-1",
    });

    expect(h.studentUpdateMock).toHaveBeenCalled();
    expect(h.studentFindFirstMock).toHaveBeenCalled();
  });

  it("returns notFound for missing student", async () => {
    h.queryRawMock.mockResolvedValue([]);

    const result = await removeStudentAppAccess({
      organizationId: "org-a",
      studentId: "missing",
    });

    expect(result).toEqual({ ok: false, notFound: true });
  });

  it("returns 409 for MANUAL_ONLY state", async () => {
    h.studentFindFirstMock.mockResolvedValue({
      ...appUserRow,
      appAccessMode: "MANUAL_ONLY",
      userId: null,
    });

    const result = await removeStudentAppAccess({
      organizationId: "org-a",
      studentId: "stu-1",
    });

    expect(result).toMatchObject({
      ok: false,
      notFound: false,
      code: STUDENT_APP_ACCESS_REMOVE_CODE.STUDENT_APP_ACCESS_ALREADY_REMOVED,
    });
  });

  it("returns 409 for INVITED state", async () => {
    h.studentFindFirstMock.mockResolvedValue({
      ...appUserRow,
      appAccessMode: "INVITED",
      userId: null,
    });

    const result = await removeStudentAppAccess({
      organizationId: "org-a",
      studentId: "stu-1",
    });

    expect(result).toMatchObject({
      ok: false,
      code: STUDENT_APP_ACCESS_REMOVE_CODE.STUDENT_NOT_APP_USER,
    });
  });

  it("returns 409 when linked user role mismatch", async () => {
    h.userFindFirstMock.mockResolvedValue({
      ...linkedUser,
      role: "INSTRUCTOR",
    });

    const result = await removeStudentAppAccess({
      organizationId: "org-a",
      studentId: "stu-1",
    });

    expect(result).toMatchObject({
      ok: false,
      code: STUDENT_APP_ACCESS_REMOVE_CODE.LINKED_USER_ROLE_MISMATCH,
    });
    expect(h.studentUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 409 when linked user tenant mismatch", async () => {
    h.userFindFirstMock.mockResolvedValue({
      ...linkedUser,
      organizationId: "org-other",
    });

    const result = await removeStudentAppAccess({
      organizationId: "org-a",
      studentId: "stu-1",
    });

    expect(result).toMatchObject({
      ok: false,
      code: STUDENT_APP_ACCESS_REMOVE_CODE.LINKED_USER_TENANT_MISMATCH,
    });
  });

  it("returns 409 when linked user missing", async () => {
    h.userFindFirstMock.mockResolvedValue(null);

    const result = await removeStudentAppAccess({
      organizationId: "org-a",
      studentId: "stu-1",
    });

    expect(result).toMatchObject({
      ok: false,
      code: STUDENT_APP_ACCESS_REMOVE_CODE.LINKED_USER_NOT_FOUND,
    });
  });

  it("returns stable 409 on second remove (already MANUAL_ONLY)", async () => {
    h.studentFindFirstMock.mockResolvedValue({
      ...appUserRow,
      appAccessMode: "MANUAL_ONLY",
      userId: null,
    });

    const result = await removeStudentAppAccess({
      organizationId: "org-a",
      studentId: "stu-1",
    });

    expect(result).toMatchObject({
      ok: false,
      code: STUDENT_APP_ACCESS_REMOVE_CODE.STUDENT_APP_ACCESS_ALREADY_REMOVED,
    });
  });
});
