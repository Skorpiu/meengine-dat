import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const queryRawMock = vi.fn();
  const invitationFindFirstMock = vi.fn();
  const invitationUpdateMock = vi.fn();
  const userFindUniqueMock = vi.fn();
  const studentFindFirstMock = vi.fn();
  const studentUpdateMock = vi.fn();
  const transactionMock = vi.fn();

  const txMock = {
    $queryRaw: queryRawMock,
    userInvitation: {
      findFirst: invitationFindFirstMock,
      update: invitationUpdateMock,
    },
    user: {
      findUnique: userFindUniqueMock,
    },
    student: {
      findFirst: studentFindFirstMock,
      update: studentUpdateMock,
    },
  };

  return {
    queryRawMock,
    invitationFindFirstMock,
    invitationUpdateMock,
    userFindUniqueMock,
    studentFindFirstMock,
    studentUpdateMock,
    transactionMock,
    txMock,
    prismaMock: {
      $transaction: transactionMock,
    },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
}));

import {
  changeInvitationEmail,
  INVITATION_EMAIL_UPDATE_CODE,
} from "./invitation-email-update-service";
import {
  buildInvitationAcceptUrl,
  hashInvitationToken,
} from "./invitation-token-service";

const baseDate = new Date("2026-05-21T12:00:00.000Z");
const oldRawToken = "old-invite-token-value";
const oldTokenHash = hashInvitationToken(oldRawToken);

function invitationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    organizationId: "org-a",
    studentId: null,
    email: "old@school.test",
    role: "INSTRUCTOR",
    tokenHash: oldTokenHash,
    status: "PENDING",
    expiresAt: new Date("2026-05-28T12:00:00.000Z"),
    acceptedAt: null,
    revokedAt: null,
    createdByUserId: "admin-1",
    acceptedUserId: null,
    createdAt: baseDate,
    updatedAt: baseDate,
    createdBy: null,
    acceptedUser: null,
    ...overrides,
  };
}

let capturedUpdateData: Record<string, unknown> | null = null;
let capturedRawToken: string | null = null;

vi.mock("./invitation-token-service", async () => {
  const actual = await vi.importActual<
    typeof import("./invitation-token-service")
  >("./invitation-token-service");
  return {
    ...actual,
    generateInvitationToken: vi.fn(() => {
      capturedRawToken = "new-generated-token-value";
      return capturedRawToken;
    }),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  capturedUpdateData = null;
  capturedRawToken = null;

  h.transactionMock.mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) => fn(h.txMock),
  );
  h.queryRawMock.mockResolvedValue([{ id: "inv-1" }]);
  h.userFindUniqueMock.mockResolvedValue(null);
  h.studentFindFirstMock.mockResolvedValue(null);
  h.studentUpdateMock.mockResolvedValue({ id: "stu-1" });
  h.invitationFindFirstMock.mockImplementation(async (args) => {
    if (args?.where?.email) {
      return null;
    }
    return invitationRow();
  });
  h.invitationUpdateMock.mockImplementation(async (args) => {
    capturedUpdateData = args.data;
    return invitationRow({
      email: args.data.email,
      tokenHash: args.data.tokenHash,
      expiresAt: args.data.expiresAt,
    });
  });
});

describe("changeInvitationEmail", () => {
  it("updates unlinked INSTRUCTOR pending invitation and returns new inviteLink", async () => {
    const result = await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "new@school.test",
      baseUrl: "http://school.example.com",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.invitation.email).toBe("new@school.test");
    expect(result.inviteLink).toBe(
      buildInvitationAcceptUrl({
        baseUrl: "http://school.example.com",
        token: "new-generated-token-value",
      }),
    );
    expect(capturedUpdateData?.email).toBe("new@school.test");
    expect(capturedUpdateData?.tokenHash).not.toBe(oldTokenHash);
  });

  it("regenerates tokenHash different from previous", async () => {
    await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "new@school.test",
      baseUrl: "http://school.example.com",
    });

    expect(capturedUpdateData?.tokenHash).toBeDefined();
    expect(capturedUpdateData?.tokenHash).not.toBe(oldTokenHash);
    expect(capturedUpdateData?.tokenHash).toBe(
      hashInvitationToken("new-generated-token-value"),
    );
  });

  it("old token hash no longer matches stored hash after update", async () => {
    await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "new@school.test",
      baseUrl: "http://school.example.com",
    });

    expect(hashInvitationToken(oldRawToken)).toBe(oldTokenHash);
    expect(capturedUpdateData?.tokenHash).not.toBe(
      hashInvitationToken(oldRawToken),
    );
  });

  it("new token hash would resolve invitation with updated email", async () => {
    const result = await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "new@school.test",
      baseUrl: "http://school.example.com",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const newTokenFromLink = new URL(result.inviteLink).searchParams.get(
      "token",
    );
    expect(newTokenFromLink).toBe("new-generated-token-value");
    expect(hashInvitationToken(newTokenFromLink!)).toBe(
      capturedUpdateData?.tokenHash,
    );
    expect(result.invitation.email).toBe("new@school.test");
  });

  it("returns 400 invalid_email for malformed email", async () => {
    const result = await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "not-an-email",
      baseUrl: "http://school.example.com",
    });

    expect(result.ok).toBe(false);
    if (result.ok || result.notFound) return;
    expect(result.status).toBe(400);
    expect(result.code).toBe(INVITATION_EMAIL_UPDATE_CODE.INVALID_EMAIL);
  });

  it("returns 400 email_unchanged when normalized email matches", async () => {
    const result = await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "OLD@school.test",
      baseUrl: "http://school.example.com",
    });

    expect(result.ok).toBe(false);
    if (result.ok || result.notFound) return;
    expect(result.status).toBe(400);
    expect(result.code).toBe(INVITATION_EMAIL_UPDATE_CODE.EMAIL_UNCHANGED);
  });

  it("returns 409 user_already_exists when User.email collides", async () => {
    h.userFindUniqueMock.mockResolvedValue({ id: "user-9" });

    const result = await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "taken@school.test",
      baseUrl: "http://school.example.com",
    });

    expect(result.ok).toBe(false);
    if (result.ok || result.notFound) return;
    expect(result.status).toBe(409);
    expect(result.code).toBe(INVITATION_EMAIL_UPDATE_CODE.USER_ALREADY_EXISTS);
  });

  it("returns 409 pending_invitation_exists for another pending invite", async () => {
    h.invitationFindFirstMock.mockImplementation(async (args) => {
      if (args?.where?.email) {
        return { id: "inv-other" };
      }
      return invitationRow();
    });

    const result = await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "other@school.test",
      baseUrl: "http://school.example.com",
    });

    expect(result.ok).toBe(false);
    if (result.ok || result.notFound) return;
    expect(result.status).toBe(409);
    expect(result.code).toBe(
      INVITATION_EMAIL_UPDATE_CODE.PENDING_INVITATION_EXISTS,
    );
  });

  it("updates unlinked STUDENT pending invitation and returns new inviteLink", async () => {
    h.invitationFindFirstMock.mockImplementation(async (args) => {
      if (args?.where?.email) {
        return null;
      }
      return invitationRow({ role: "STUDENT" });
    });
    h.invitationUpdateMock.mockImplementation(async (args) => {
      capturedUpdateData = args.data;
      return invitationRow({
        role: "STUDENT",
        email: args.data.email,
        tokenHash: args.data.tokenHash,
        expiresAt: args.data.expiresAt,
      });
    });

    const result = await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "new@school.test",
      baseUrl: "http://school.example.com",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.invitation.email).toBe("new@school.test");
    expect(result.invitation.role).toBe("STUDENT");
    expect(capturedUpdateData?.tokenHash).not.toBe(oldTokenHash);
    expect(h.studentFindFirstMock).toHaveBeenCalled();
  });

  it("returns 409 student_email_already_in_use when org Student.email collides", async () => {
    h.invitationFindFirstMock.mockImplementation(async (args) => {
      if (args?.where?.email) {
        return null;
      }
      return invitationRow({ role: "STUDENT" });
    });
    h.studentFindFirstMock.mockResolvedValue({ id: "stu-9" });

    const result = await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "taken@school.test",
      baseUrl: "http://school.example.com",
    });

    expect(result.ok).toBe(false);
    if (result.ok || result.notFound) return;
    expect(result.status).toBe(409);
    expect(result.code).toBe(
      INVITATION_EMAIL_UPDATE_CODE.STUDENT_EMAIL_ALREADY_IN_USE,
    );
  });

  it("does not check Student.email collision for INSTRUCTOR invitations", async () => {
    await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "new@school.test",
      baseUrl: "http://school.example.com",
    });

    expect(h.studentFindFirstMock).not.toHaveBeenCalled();
  });

  it("returns 409 invitation_not_pending for ACCEPTED invitation", async () => {
    h.invitationFindFirstMock.mockResolvedValue(
      invitationRow({ status: "ACCEPTED" }),
    );

    const result = await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "new@school.test",
      baseUrl: "http://school.example.com",
    });

    expect(result.ok).toBe(false);
    if (result.ok || result.notFound) return;
    expect(result.status).toBe(409);
    expect(result.code).toBe(
      INVITATION_EMAIL_UPDATE_CODE.INVITATION_NOT_PENDING,
    );
  });

  it("returns 409 invitation_not_pending for REVOKED invitation", async () => {
    h.invitationFindFirstMock.mockResolvedValue(
      invitationRow({ status: "REVOKED" }),
    );

    const result = await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "new@school.test",
      baseUrl: "http://school.example.com",
    });

    expect(result.ok).toBe(false);
    if (result.ok || result.notFound) return;
    expect(result.code).toBe(
      INVITATION_EMAIL_UPDATE_CODE.INVITATION_NOT_PENDING,
    );
  });

  it("updates linked STUDENT pending invitation and syncs Student.email", async () => {
    h.queryRawMock.mockResolvedValue([{ id: "inv-1" }, { id: "stu-1" }]);
    h.invitationFindFirstMock.mockImplementation(async (args) => {
      if (args?.where?.email) {
        return null;
      }
      return invitationRow({ studentId: "stu-1", role: "STUDENT" });
    });
    h.studentFindFirstMock.mockImplementation(async (args) => {
      if (args?.where?.id === "stu-1") {
        return {
          id: "stu-1",
          userId: null,
          appAccessMode: "INVITED",
          email: "old@school.test",
        };
      }
      if (args?.where?.email) {
        return null;
      }
      return null;
    });
    h.invitationUpdateMock.mockImplementation(async (args) =>
      invitationRow({
        studentId: "stu-1",
        role: "STUDENT",
        email: args.data.email,
        tokenHash: args.data.tokenHash,
        expiresAt: args.data.expiresAt,
      }),
    );

    const result = await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "new@school.test",
      baseUrl: "http://school.example.com",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.invitation.email).toBe("new@school.test");
    expect(result.invitation.studentId).toBe("stu-1");
    expect(h.studentUpdateMock).toHaveBeenCalledWith({
      where: { id: "stu-1" },
      data: { email: "new@school.test" },
    });
    expect(capturedUpdateData?.tokenHash).not.toBe(oldTokenHash);
  });

  it("preserves INVITED and userId null on linked STUDENT update", async () => {
    h.queryRawMock.mockResolvedValue([{ id: "inv-1" }, { id: "stu-1" }]);
    h.invitationFindFirstMock.mockImplementation(async (args) => {
      if (args?.where?.email) return null;
      return invitationRow({ studentId: "stu-1", role: "STUDENT" });
    });
    h.studentFindFirstMock.mockImplementation(async (args) => {
      if (args?.where?.id === "stu-1") {
        return {
          id: "stu-1",
          userId: null,
          appAccessMode: "INVITED",
          email: "old@school.test",
        };
      }
      if (args?.where?.email) {
        return null;
      }
      return null;
    });

    await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "new@school.test",
      baseUrl: "http://school.example.com",
    });

    expect(h.studentUpdateMock).toHaveBeenCalledWith({
      where: { id: "stu-1" },
      data: { email: "new@school.test" },
    });
    expect(h.studentUpdateMock.mock.calls[0][0].data).not.toHaveProperty(
      "appAccessMode",
    );
    expect(h.studentUpdateMock.mock.calls[0][0].data).not.toHaveProperty(
      "userId",
    );
  });

  it("allows linked STUDENT email collision check to exclude linked student", async () => {
    h.queryRawMock.mockResolvedValue([{ id: "inv-1" }, { id: "stu-1" }]);
    h.invitationFindFirstMock.mockImplementation(async (args) => {
      if (args?.where?.email) return null;
      return invitationRow({
        studentId: "stu-1",
        role: "STUDENT",
        email: "old@school.test",
      });
    });
    h.studentFindFirstMock.mockImplementation(async (args) => {
      if (args?.where?.id === "stu-1") {
        return {
          id: "stu-1",
          userId: null,
          appAccessMode: "INVITED",
          email: "old@school.test",
        };
      }
      return null;
    });

    const result = await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "old@school.test",
      baseUrl: "http://school.example.com",
    });

    expect(result.ok).toBe(false);
    if (result.ok || result.notFound) return;
    expect(result.code).toBe(INVITATION_EMAIL_UPDATE_CODE.EMAIL_UNCHANGED);
  });

  it("returns 409 student_email_already_in_use for another org student on linked invite", async () => {
    h.queryRawMock.mockResolvedValue([{ id: "inv-1" }, { id: "stu-1" }]);
    h.invitationFindFirstMock.mockImplementation(async (args) => {
      if (args?.where?.email) return null;
      return invitationRow({ studentId: "stu-1", role: "STUDENT" });
    });
    h.studentFindFirstMock.mockImplementation(async (args) => {
      if (args?.where?.id === "stu-1") {
        return {
          id: "stu-1",
          userId: null,
          appAccessMode: "INVITED",
          email: "old@school.test",
        };
      }
      if (args?.where?.email) {
        return { id: "stu-other" };
      }
      return null;
    });

    const result = await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "other@school.test",
      baseUrl: "http://school.example.com",
    });

    expect(result.ok).toBe(false);
    if (result.ok || result.notFound) return;
    expect(result.code).toBe(
      INVITATION_EMAIL_UPDATE_CODE.STUDENT_EMAIL_ALREADY_IN_USE,
    );
  });

  it("returns 404 linked_student_not_found when linked student is missing", async () => {
    h.queryRawMock.mockResolvedValue([{ id: "inv-1" }]);
    h.invitationFindFirstMock.mockResolvedValue(
      invitationRow({ studentId: "stu-missing", role: "STUDENT" }),
    );

    const result = await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "new@school.test",
      baseUrl: "http://school.example.com",
    });

    expect(result.ok).toBe(false);
    if (result.ok || result.notFound) return;
    expect(result.status).toBe(404);
    expect(result.code).toBe(
      INVITATION_EMAIL_UPDATE_CODE.LINKED_STUDENT_NOT_FOUND,
    );
  });

  it("returns 409 student_already_linked when linked student has userId", async () => {
    h.queryRawMock.mockResolvedValue([{ id: "inv-1" }, { id: "stu-1" }]);
    h.invitationFindFirstMock.mockResolvedValue(
      invitationRow({ studentId: "stu-1", role: "STUDENT" }),
    );
    h.studentFindFirstMock.mockResolvedValue({
      id: "stu-1",
      userId: "user-1",
      appAccessMode: "APP_USER",
      email: "old@school.test",
    });

    const result = await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "new@school.test",
      baseUrl: "http://school.example.com",
    });

    expect(result.ok).toBe(false);
    if (result.ok || result.notFound) return;
    expect(result.code).toBe(
      INVITATION_EMAIL_UPDATE_CODE.STUDENT_ALREADY_LINKED,
    );
  });

  it("returns 409 unsupported_linked_student_invitation for INSTRUCTOR with studentId", async () => {
    h.invitationFindFirstMock.mockResolvedValue(
      invitationRow({ studentId: "stu-1", role: "INSTRUCTOR" }),
    );

    const result = await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "new@school.test",
      baseUrl: "http://school.example.com",
    });

    expect(result.ok).toBe(false);
    if (result.ok || result.notFound) return;
    expect(result.code).toBe(
      INVITATION_EMAIL_UPDATE_CODE.UNSUPPORTED_LINKED_STUDENT_INVITATION,
    );
  });

  it("returns notFound for cross-tenant / missing invitation", async () => {
    h.queryRawMock.mockResolvedValue([]);

    const result = await changeInvitationEmail({
      organizationId: "org-a",
      invitationId: "inv-other",
      newEmail: "new@school.test",
      baseUrl: "http://school.example.com",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.notFound).toBe(true);
  });
});
