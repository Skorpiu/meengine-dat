import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => {
  const queryRawMock = vi.fn();
  const studentFindFirstMock = vi.fn();
  const studentUpdateMock = vi.fn();
  const userFindUniqueMock = vi.fn();
  const userFindFirstMock = vi.fn();
  const userUpdateMock = vi.fn();
  const sessionDeleteManyMock = vi.fn();
  const passwordResetUpdateManyMock = vi.fn();
  const emailVerificationUpdateManyMock = vi.fn();
  const invitationUpdateManyMock = vi.fn();
  const invitationFindFirstMock = vi.fn();
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
          findUnique: userFindUniqueMock,
          findFirst: userFindFirstMock,
          update: userUpdateMock,
        },
        session: { deleteMany: sessionDeleteManyMock },
        passwordResetToken: { updateMany: passwordResetUpdateManyMock },
        emailVerificationToken: { updateMany: emailVerificationUpdateManyMock },
        userInvitation: {
          updateMany: invitationUpdateManyMock,
          findFirst: invitationFindFirstMock,
        },
      };
      return fn(tx);
    },
  );

  return {
    queryRawMock,
    studentFindFirstMock,
    studentUpdateMock,
    userFindUniqueMock,
    userFindFirstMock,
    userUpdateMock,
    sessionDeleteManyMock,
    passwordResetUpdateManyMock,
    emailVerificationUpdateManyMock,
    invitationUpdateManyMock,
    invitationFindFirstMock,
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
  changeStudentEmail,
  validateStudentRecordEmailPatchAllowed,
  STUDENT_EMAIL_CHANGE_CODE,
} from "@/lib/students/student-email-change-service";

function isDuplicateStudentEmailQuery(args: {
  where?: { id?: unknown };
}): boolean {
  return (
    typeof args?.where?.id === "object" &&
    args.where.id !== null &&
    "not" in args.where.id
  );
}

const updatedStudentRow = {
  id: "stu-1",
  userId: null,
  firstName: "João",
  lastName: "Silva",
  email: "new@school.test",
  phoneNumber: null,
  address: null,
  schoolStudentId: "26001",
  schoolStudentYearSuffix: "26",
  schoolStudentSequence: 1,
  schoolStudentIdSource: "MANUAL",
  enrollmentDate: new Date("2026-05-29T10:00:00.000Z"),
  appAccessMode: "MANUAL_ONLY" as const,
  createdAt: new Date("2026-05-29T10:00:00.000Z"),
  updatedAt: new Date("2026-06-08T10:00:00.000Z"),
  category: null,
  transmissionType: null,
  user: null,
  userInvitations: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  h.queryRawMock.mockResolvedValue([{ id: "stu-1" }]);
  h.userFindUniqueMock.mockResolvedValue(null);
  h.invitationFindFirstMock.mockResolvedValue(null);
  h.studentUpdateMock.mockResolvedValue({});
  h.userUpdateMock.mockResolvedValue({});
  h.sessionDeleteManyMock.mockResolvedValue({ count: 0 });
  h.passwordResetUpdateManyMock.mockResolvedValue({ count: 0 });
  h.emailVerificationUpdateManyMock.mockResolvedValue({ count: 0 });
  h.invitationUpdateManyMock.mockResolvedValue({ count: 0 });
  h.studentFindFirstAfterMock.mockResolvedValue(updatedStudentRow);
  h.prismaMock.student.findFirst = h.studentFindFirstAfterMock;
});

describe("validateStudentRecordEmailPatchAllowed", () => {
  const patchGuardFindFirstMock = vi.fn();

  beforeEach(() => {
    h.prismaMock.student.findFirst = patchGuardFindFirstMock;
  });

  afterEach(() => {
    h.prismaMock.student.findFirst = h.studentFindFirstAfterMock;
  });

  it("allows MANUAL_ONLY without user or pending invitation", async () => {
    patchGuardFindFirstMock.mockResolvedValue({
      id: "stu-1",
      organizationId: "org-a",
      appAccessMode: "MANUAL_ONLY",
      userId: null,
      email: "old@school.test",
      userInvitations: [],
    });

    const result = await validateStudentRecordEmailPatchAllowed({
      organizationId: "org-a",
      studentId: "stu-1",
    });

    expect(result).toEqual({ ok: true });
  });

  it("blocks APP_USER with use_change_email_flow", async () => {
    patchGuardFindFirstMock.mockResolvedValue({
      id: "stu-1",
      organizationId: "org-a",
      appAccessMode: "APP_USER",
      userId: "user-1",
      email: "old@school.test",
      userInvitations: [],
    });

    const result = await validateStudentRecordEmailPatchAllowed({
      organizationId: "org-a",
      studentId: "stu-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(STUDENT_EMAIL_CHANGE_CODE.USE_CHANGE_EMAIL_FLOW);
    }
  });
});

describe("changeStudentEmail", () => {
  it("updates MANUAL_ONLY student email", async () => {
    h.studentFindFirstMock.mockImplementation(
      (args: { where?: { id?: { not?: string } } }) => {
        if (isDuplicateStudentEmailQuery(args)) {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          id: "stu-1",
          organizationId: "org-a",
          appAccessMode: "MANUAL_ONLY",
          userId: null,
          email: "old@school.test",
        });
      },
    );

    const result = await changeStudentEmail({
      organizationId: "org-a",
      studentId: "stu-1",
      newEmail: "new@school.test",
    });

    expect(result.ok).toBe(true);
    expect(h.studentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { email: "new@school.test" },
      }),
    );
  });

  it("revokes invitation and sets MANUAL_ONLY for INVITED", async () => {
    h.studentFindFirstMock.mockImplementation(
      (args: { where?: { id?: { not?: string } } }) => {
        if (isDuplicateStudentEmailQuery(args)) {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          id: "stu-1",
          organizationId: "org-a",
          appAccessMode: "INVITED",
          userId: null,
          email: "old@school.test",
        });
      },
    );

    const result = await changeStudentEmail({
      organizationId: "org-a",
      studentId: "stu-1",
      newEmail: "new@school.test",
    });

    expect(result.ok).toBe(true);
    expect(h.invitationUpdateManyMock).toHaveBeenCalled();
    expect(h.studentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          email: "new@school.test",
          appAccessMode: "MANUAL_ONLY",
        },
      }),
    );
  });

  it("updates User and Student for APP_USER and invalidates access", async () => {
    h.studentFindFirstMock.mockImplementation(
      (args: { where?: { id?: { not?: string } } }) => {
        if (isDuplicateStudentEmailQuery(args)) {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          id: "stu-1",
          organizationId: "org-a",
          appAccessMode: "APP_USER",
          userId: "user-1",
          email: "old@school.test",
        });
      },
    );
    h.userFindFirstMock.mockResolvedValue({
      id: "user-1",
      email: "old@school.test",
      role: "STUDENT",
      organizationId: "org-a",
    });

    const result = await changeStudentEmail({
      organizationId: "org-a",
      studentId: "stu-1",
      newEmail: "new@school.test",
    });

    expect(result.ok).toBe(true);
    expect(h.sessionDeleteManyMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(h.passwordResetUpdateManyMock).toHaveBeenCalled();
    expect(h.emailVerificationUpdateManyMock).toHaveBeenCalled();
    expect(h.userUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          email: "new@school.test",
          isEmailVerified: true,
        }),
      }),
    );
    expect(h.studentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { email: "new@school.test" },
      }),
    );
  });

  it("returns user_email_already_exists when another user has the email", async () => {
    h.studentFindFirstMock.mockImplementation(
      (args: { where?: { id?: { not?: string } } }) => {
        if (isDuplicateStudentEmailQuery(args)) {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          id: "stu-1",
          organizationId: "org-a",
          appAccessMode: "MANUAL_ONLY",
          userId: null,
          email: "old@school.test",
        });
      },
    );
    h.userFindUniqueMock.mockResolvedValue({ id: "other-user" });

    const result = await changeStudentEmail({
      organizationId: "org-a",
      studentId: "stu-1",
      newEmail: "taken@school.test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(
        STUDENT_EMAIL_CHANGE_CODE.USER_EMAIL_ALREADY_EXISTS,
      );
    }
  });

  it("returns student_email_already_in_use for duplicate student email", async () => {
    h.studentFindFirstMock.mockImplementation(
      (args: { where?: { id?: { not?: string } } }) => {
        if (isDuplicateStudentEmailQuery(args)) {
          return Promise.resolve({ id: "stu-2" });
        }
        return Promise.resolve({
          id: "stu-1",
          organizationId: "org-a",
          appAccessMode: "MANUAL_ONLY",
          userId: null,
          email: "old@school.test",
        });
      },
    );

    const result = await changeStudentEmail({
      organizationId: "org-a",
      studentId: "stu-1",
      newEmail: "taken@school.test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(
        STUDENT_EMAIL_CHANGE_CODE.STUDENT_EMAIL_ALREADY_IN_USE,
      );
    }
  });

  it("returns pending_invitation_exists for conflicting invitation", async () => {
    h.studentFindFirstMock.mockImplementation(
      (args: { where?: { id?: { not?: string } } }) => {
        if (isDuplicateStudentEmailQuery(args)) {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          id: "stu-1",
          organizationId: "org-a",
          appAccessMode: "MANUAL_ONLY",
          userId: null,
          email: "old@school.test",
        });
      },
    );
    h.invitationFindFirstMock.mockResolvedValue({
      id: "inv-1",
      studentId: "stu-9",
    });

    const result = await changeStudentEmail({
      organizationId: "org-a",
      studentId: "stu-1",
      newEmail: "invited@school.test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(
        STUDENT_EMAIL_CHANGE_CODE.PENDING_INVITATION_EXISTS,
      );
    }
  });

  it("returns email_unchanged when normalized email matches", async () => {
    h.studentFindFirstMock.mockImplementation(
      (args: { where?: { id?: { not?: string } } }) => {
        if (isDuplicateStudentEmailQuery(args)) {
          return Promise.resolve(null);
        }
        return Promise.resolve({
          id: "stu-1",
          organizationId: "org-a",
          appAccessMode: "MANUAL_ONLY",
          userId: null,
          email: "same@school.test",
        });
      },
    );

    const result = await changeStudentEmail({
      organizationId: "org-a",
      studentId: "stu-1",
      newEmail: "  Same@School.TEST ",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(STUDENT_EMAIL_CHANGE_CODE.EMAIL_UNCHANGED);
    }
  });
});
