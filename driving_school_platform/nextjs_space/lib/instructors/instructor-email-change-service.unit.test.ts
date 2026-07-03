import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const queryRawMock = vi.fn();
  const instructorFindFirstMock = vi.fn();
  const userFindUniqueMock = vi.fn();
  const userFindFirstMock = vi.fn();
  const userUpdateMock = vi.fn();
  const sessionDeleteManyMock = vi.fn();
  const passwordResetUpdateManyMock = vi.fn();
  const emailVerificationUpdateManyMock = vi.fn();
  const invitationUpdateManyMock = vi.fn();
  const invitationFindFirstMock = vi.fn();
  const userFindFirstAfterMock = vi.fn();

  const transactionMock = vi.fn(
    async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $queryRaw: queryRawMock,
        instructor: {
          findFirst: instructorFindFirstMock,
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
    instructorFindFirstMock,
    userFindUniqueMock,
    userFindFirstMock,
    userUpdateMock,
    sessionDeleteManyMock,
    passwordResetUpdateManyMock,
    emailVerificationUpdateManyMock,
    invitationUpdateManyMock,
    invitationFindFirstMock,
    userFindFirstAfterMock,
    transactionMock,
    prismaMock: {
      $transaction: transactionMock,
      user: { findFirst: userFindFirstAfterMock },
    },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
}));

import {
  changeInstructorEmail,
  INSTRUCTOR_EMAIL_CHANGE_CODE,
} from "@/lib/instructors/instructor-email-change-service";

const activeRow = {
  id: "inst-1",
  organizationId: "org-a",
  userId: "user-1",
  isAvailableForBooking: true,
  user: {
    id: "user-1",
    email: "old@school.test",
    role: "INSTRUCTOR" as const,
    organizationId: "org-a",
    isApproved: true,
  },
};

const pendingApprovalRow = {
  ...activeRow,
  user: {
    ...activeRow.user,
    isApproved: false,
  },
};

const deactivatedRow = {
  ...activeRow,
  isAvailableForBooking: false,
  user: {
    ...activeRow.user,
    isApproved: false,
  },
};

const updatedUserRow = {
  id: "user-1",
  email: "new@school.test",
  firstName: "Ana",
  lastName: "Costa",
  phoneNumber: null,
  address: null,
  role: "INSTRUCTOR" as const,
  isApproved: true,
  instructor: {
    id: "inst-1",
    instructorIdNumber: "INS-001",
    instructorLicenseNumber: "LIC-1",
    instructorLicenseExpiry: new Date("2027-01-01T00:00:00.000Z"),
    isAvailableForBooking: true,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  h.queryRawMock.mockResolvedValue([{ id: "inst-1" }]);
  h.userFindUniqueMock.mockResolvedValue(null);
  h.invitationFindFirstMock.mockResolvedValue(null);
  h.userUpdateMock.mockResolvedValue({});
  h.sessionDeleteManyMock.mockResolvedValue({ count: 1 });
  h.passwordResetUpdateManyMock.mockResolvedValue({ count: 0 });
  h.emailVerificationUpdateManyMock.mockResolvedValue({ count: 0 });
  h.invitationUpdateManyMock.mockResolvedValue({ count: 0 });
  h.userFindFirstAfterMock.mockResolvedValue(updatedUserRow);
  h.prismaMock.user.findFirst = h.userFindFirstAfterMock;
});

describe("changeInstructorEmail success paths", () => {
  it.each([
    ["active", activeRow, true, true],
    ["pending approval", pendingApprovalRow, false, true],
    ["deactivated", deactivatedRow, false, false],
  ])(
    "updates email for %s instructor",
    async (_label, row, isApproved, isAvailableForBooking) => {
      h.instructorFindFirstMock.mockResolvedValue(row);
      h.userFindFirstAfterMock.mockResolvedValue({
        ...updatedUserRow,
        isApproved,
        instructor: {
          ...updatedUserRow.instructor,
          isAvailableForBooking,
        },
      });

      const result = await changeInstructorEmail({
        organizationId: "org-a",
        instructorId: "inst-1",
        newEmail: "new@school.test",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.user.email).toBe("new@school.test");
        expect(result.user.isApproved).toBe(isApproved);
        expect(result.user.instructor?.isAvailableForBooking).toBe(
          isAvailableForBooking,
        );
        expect(result.audit).toEqual({
          hasLinkedUser: true,
          emailChanged: true,
          pendingInvitationBlocked: false,
          userEmailUpdated: true,
          instructorEmailUpdated: false,
          invitationRevoked: false,
          linkedUserId: "user-1",
        });
      }
      expect(h.userUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({
            email: "new@school.test",
            isEmailVerified: true,
          }),
        }),
      );
    },
  );

  it("sets invitationRevoked when pending invitations are revoked", async () => {
    h.instructorFindFirstMock.mockResolvedValue(activeRow);
    h.invitationUpdateManyMock.mockResolvedValue({ count: 1 });

    const result = await changeInstructorEmail({
      organizationId: "org-a",
      instructorId: "inst-1",
      newEmail: "new@school.test",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.audit.invitationRevoked).toBe(true);
    }
  });
});

describe("changeInstructorEmail validation", () => {
  beforeEach(() => {
    h.instructorFindFirstMock.mockResolvedValue(activeRow);
  });

  it("returns email_unchanged when normalized email matches", async () => {
    const result = await changeInstructorEmail({
      organizationId: "org-a",
      instructorId: "inst-1",
      newEmail: "  Old@School.TEST ",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(INSTRUCTOR_EMAIL_CHANGE_CODE.EMAIL_UNCHANGED);
      expect(result.status).toBe(400);
    }
  });

  it("returns invalid_email for malformed address", async () => {
    const result = await changeInstructorEmail({
      organizationId: "org-a",
      instructorId: "inst-1",
      newEmail: "not-an-email",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(INSTRUCTOR_EMAIL_CHANGE_CODE.INVALID_EMAIL);
      expect(result.status).toBe(400);
    }
  });

  it("returns user_email_already_exists when another user has the email", async () => {
    h.userFindUniqueMock.mockResolvedValue({ id: "other-user" });

    const result = await changeInstructorEmail({
      organizationId: "org-a",
      instructorId: "inst-1",
      newEmail: "taken@school.test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(
        INSTRUCTOR_EMAIL_CHANGE_CODE.USER_EMAIL_ALREADY_EXISTS,
      );
      expect(result.status).toBe(409);
    }
  });

  it("returns pending_invitation_exists for conflicting invitation", async () => {
    h.invitationFindFirstMock.mockResolvedValue({ id: "inv-1" });

    const result = await changeInstructorEmail({
      organizationId: "org-a",
      instructorId: "inst-1",
      newEmail: "invited@school.test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(
        INSTRUCTOR_EMAIL_CHANGE_CODE.PENDING_INVITATION_EXISTS,
      );
    }
  });

  it("returns notFound when instructor is missing or cross-tenant", async () => {
    h.queryRawMock.mockResolvedValue([]);

    const result = await changeInstructorEmail({
      organizationId: "org-a",
      instructorId: "inst-9",
      newEmail: "new@school.test",
    });

    expect(result).toEqual({ ok: false, notFound: true });
  });

  it("returns linked_user_role_mismatch", async () => {
    h.instructorFindFirstMock.mockResolvedValue({
      ...activeRow,
      user: { ...activeRow.user, role: "STUDENT" },
    });

    const result = await changeInstructorEmail({
      organizationId: "org-a",
      instructorId: "inst-1",
      newEmail: "new@school.test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(
        INSTRUCTOR_EMAIL_CHANGE_CODE.LINKED_USER_ROLE_MISMATCH,
      );
    }
  });

  it("returns linked_user_tenant_mismatch", async () => {
    h.instructorFindFirstMock.mockResolvedValue({
      ...activeRow,
      user: { ...activeRow.user, organizationId: "org-b" },
    });

    const result = await changeInstructorEmail({
      organizationId: "org-a",
      instructorId: "inst-1",
      newEmail: "new@school.test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(
        INSTRUCTOR_EMAIL_CHANGE_CODE.LINKED_USER_TENANT_MISMATCH,
      );
    }
  });

  it("returns linked_user_not_found when user relation missing", async () => {
    h.instructorFindFirstMock.mockResolvedValue({
      ...activeRow,
      user: null,
    });

    const result = await changeInstructorEmail({
      organizationId: "org-a",
      instructorId: "inst-1",
      newEmail: "new@school.test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && !result.notFound) {
      expect(result.code).toBe(
        INSTRUCTOR_EMAIL_CHANGE_CODE.LINKED_USER_NOT_FOUND,
      );
    }
  });
});

describe("changeInstructorEmail side effects", () => {
  beforeEach(() => {
    h.instructorFindFirstMock.mockResolvedValue(activeRow);
  });

  it("invalidates sessions and tokens", async () => {
    const result = await changeInstructorEmail({
      organizationId: "org-a",
      instructorId: "inst-1",
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
          passwordResetToken: null,
          emailVerificationToken: null,
        }),
      }),
    );
  });

  it("revokes pending INSTRUCTOR invitations on old email", async () => {
    const result = await changeInstructorEmail({
      organizationId: "org-a",
      instructorId: "inst-1",
      newEmail: "new@school.test",
    });

    expect(result.ok).toBe(true);
    expect(h.invitationUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-a",
          status: "PENDING",
          role: "INSTRUCTOR",
          email: "old@school.test",
        }),
        data: expect.objectContaining({ status: "REVOKED" }),
      }),
    );
  });

  it("does not update isApproved or isAvailableForBooking", async () => {
    h.instructorFindFirstMock.mockResolvedValue(deactivatedRow);
    h.userFindFirstAfterMock.mockResolvedValue({
      ...updatedUserRow,
      isApproved: false,
      instructor: {
        ...updatedUserRow.instructor,
        isAvailableForBooking: false,
      },
    });

    const result = await changeInstructorEmail({
      organizationId: "org-a",
      instructorId: "inst-1",
      newEmail: "new@school.test",
    });

    expect(result.ok).toBe(true);
    const userUpdateCalls = h.userUpdateMock.mock.calls.filter(
      (call) => call[0]?.data?.email === "new@school.test",
    );
    expect(userUpdateCalls).toHaveLength(1);
    expect(userUpdateCalls[0][0].data).not.toHaveProperty("isApproved");
  });
});
