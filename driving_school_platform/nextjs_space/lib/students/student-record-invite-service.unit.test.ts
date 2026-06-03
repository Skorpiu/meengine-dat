import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const studentFindFirst = vi.fn();
  const studentUpdate = vi.fn();
  const createInvitationMock = vi.fn();
  const transaction = vi.fn();

  const txMock = {
    student: {
      findFirst: studentFindFirst,
      update: studentUpdate,
    },
  };

  return {
    studentFindFirst,
    studentUpdate,
    createInvitationMock,
    transaction,
    txMock,
    prismaMock: {
      student: {
        findFirst: studentFindFirst,
        update: studentUpdate,
      },
      $transaction: transaction,
    },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
  db: h.prismaMock,
}));

vi.mock("@/lib/invitations/invitation-service", () => ({
  createInvitation: (...args: unknown[]) => h.createInvitationMock(...args),
}));

import { inviteExistingStudentRecord } from "./student-record-invite-service";

const manualStudent = {
  id: "stu-1",
  userId: null,
  email: "joao@school.test",
  appAccessMode: "MANUAL_ONLY" as const,
};

const invitationDto = {
  id: "inv-1",
  studentId: "stu-1",
  email: "joao@school.test",
  role: "STUDENT",
  status: "PENDING",
  expiresAt: "2099-01-01T00:00:00.000Z",
  acceptedAt: null,
  revokedAt: null,
  createdAt: "2026-05-29T10:00:00.000Z",
  updatedAt: "2026-05-29T10:00:00.000Z",
  createdBy: null,
  acceptedUser: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  h.studentFindFirst.mockResolvedValue(manualStudent);
  h.createInvitationMock.mockResolvedValue({
    ok: true,
    invitation: invitationDto,
    inviteLink: "https://school.example.com/invitations/accept?token=abc",
    organizationName: "Demo School",
  });
  h.studentUpdate.mockResolvedValue({});
  h.transaction.mockImplementation(
    async (fn: (tx: typeof h.txMock) => unknown) => fn(h.txMock),
  );
});

describe("inviteExistingStudentRecord", () => {
  it("runs createInvitation and student update inside $transaction", async () => {
    const result = await inviteExistingStudentRecord({
      organizationId: "org-a",
      createdByUserId: "admin-1",
      studentId: "stu-1",
      baseUrl: "https://school.example.com",
    });

    expect(result.ok).toBe(true);
    expect(h.transaction).toHaveBeenCalledTimes(1);
    expect(h.createInvitationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        email: "joao@school.test",
        role: "STUDENT",
        studentId: "stu-1",
        tx: h.txMock,
      }),
    );
    expect(h.studentUpdate).toHaveBeenCalledWith({
      where: { id: "stu-1" },
      data: {
        email: "joao@school.test",
        appAccessMode: "INVITED",
      },
    });
  });

  it("uses body email when provided", async () => {
    await inviteExistingStudentRecord({
      organizationId: "org-a",
      createdByUserId: "admin-1",
      studentId: "stu-1",
      email: "  Other@School.TEST ",
      baseUrl: "https://school.example.com",
    });

    expect(h.createInvitationMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: "other@school.test", tx: h.txMock }),
    );
  });

  it("blocks student from another organization without calling createInvitation", async () => {
    h.studentFindFirst.mockResolvedValue(null);

    const result = await inviteExistingStudentRecord({
      organizationId: "org-a",
      createdByUserId: "admin-1",
      studentId: "stu-other",
      baseUrl: "https://school.example.com",
    });

    expect(result).toEqual({
      ok: false,
      error: "Student not found",
      code: "student_not_found",
      status: 404,
    });
    expect(h.transaction).toHaveBeenCalledTimes(1);
    expect(h.createInvitationMock).not.toHaveBeenCalled();
    expect(h.studentUpdate).not.toHaveBeenCalled();
  });

  it("blocks student already linked to user without calling createInvitation", async () => {
    h.studentFindFirst.mockResolvedValue({
      ...manualStudent,
      userId: "user-1",
    });

    const result = await inviteExistingStudentRecord({
      organizationId: "org-a",
      createdByUserId: "admin-1",
      studentId: "stu-1",
      baseUrl: "https://school.example.com",
    });

    expect(result).toEqual({
      ok: false,
      error: "This student record is already linked to an account.",
      code: "student_already_linked",
      status: 409,
    });
    expect(h.createInvitationMock).not.toHaveBeenCalled();
    expect(h.studentUpdate).not.toHaveBeenCalled();
  });

  it("blocks when no email is available", async () => {
    h.studentFindFirst.mockResolvedValue({
      ...manualStudent,
      email: null,
    });

    const result = await inviteExistingStudentRecord({
      organizationId: "org-a",
      createdByUserId: "admin-1",
      studentId: "stu-1",
      baseUrl: "https://school.example.com",
    });

    expect(result).toEqual({
      ok: false,
      error: "An email address is required to send an invitation.",
      code: "missing_email",
      status: 400,
    });
    expect(h.createInvitationMock).not.toHaveBeenCalled();
  });

  it("does not update student when createInvitation returns pending_invitation_exists", async () => {
    h.createInvitationMock.mockResolvedValue({
      ok: false,
      error: "A pending invitation already exists for this email",
      code: "pending_invitation_exists",
      status: 409,
    });

    const result = await inviteExistingStudentRecord({
      organizationId: "org-a",
      createdByUserId: "admin-1",
      studentId: "stu-1",
      baseUrl: "https://school.example.com",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("pending_invitation_exists");
    expect(h.createInvitationMock).toHaveBeenCalledWith(
      expect.objectContaining({ tx: h.txMock }),
    );
    expect(h.studentUpdate).not.toHaveBeenCalled();
  });

  it("does not update student when user already exists with same email", async () => {
    h.createInvitationMock.mockResolvedValue({
      ok: false,
      error: "An account with this email already exists.",
      code: "user_already_exists",
      status: 409,
    });

    const result = await inviteExistingStudentRecord({
      organizationId: "org-a",
      createdByUserId: "admin-1",
      studentId: "stu-1",
      baseUrl: "https://school.example.com",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("user_already_exists");
    expect(h.studentUpdate).not.toHaveBeenCalled();
  });
});
