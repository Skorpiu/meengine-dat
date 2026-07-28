import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const userInvitationFindUnique = vi.fn();
  const userInvitationUpdateMany = vi.fn();
  const userInvitationFindUniqueOrThrow = vi.fn();
  const userFindUnique = vi.fn();
  const userCreate = vi.fn();
  const studentCreate = vi.fn();
  const studentFindFirst = vi.fn();
  const studentUpdate = vi.fn();
  const instructorCreate = vi.fn();
  const instructorFindFirst = vi.fn();
  const transaction = vi.fn();

  const prismaMock = {
    userInvitation: {
      findUnique: userInvitationFindUnique,
      updateMany: userInvitationUpdateMany,
      findUniqueOrThrow: userInvitationFindUniqueOrThrow,
    },
    user: {
      findUnique: userFindUnique,
      create: userCreate,
    },
    student: {
      create: studentCreate,
      findFirst: studentFindFirst,
      update: studentUpdate,
    },
    instructor: { create: instructorCreate, findFirst: instructorFindFirst },
    $transaction: transaction,
  };

  return {
    prismaMock,
    userInvitationFindUnique,
    userInvitationUpdateMany,
    userInvitationFindUniqueOrThrow,
    userFindUnique,
    userCreate,
    studentCreate,
    studentFindFirst,
    studentUpdate,
    instructorCreate,
    instructorFindFirst,
    transaction,
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
  db: h.prismaMock,
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async () => "hashed-password"),
  },
}));

import {
  acceptInvitation,
  getInvitationByToken,
} from "./invitation-accept-service";
import { hashInvitationToken } from "./invitation-token-service";

const rawToken = "accept-test-token-value";
const tokenHash = hashInvitationToken(rawToken);

const futureExpiry = new Date("2099-01-01T00:00:00.000Z");
const pastExpiry = new Date("2020-01-01T00:00:00.000Z");

function pendingInvitation(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    organizationId: "org-a",
    email: "student@school.test",
    role: "STUDENT",
    tokenHash,
    status: "PENDING",
    expiresAt: futureExpiry,
    acceptedAt: null,
    revokedAt: null,
    createdByUserId: "admin-1",
    acceptedUserId: null,
    studentId: null,
    createdAt: new Date("2026-05-21T12:00:00.000Z"),
    updatedAt: new Date("2026-05-21T12:00:00.000Z"),
    organization: { id: "org-a", name: "Demo School" },
    ...overrides,
  };
}

function setupSuccessfulTransaction(role: "STUDENT" | "INSTRUCTOR") {
  h.userFindUnique.mockResolvedValue(null);
  h.transaction.mockImplementation(
    async (fn: (tx: typeof h.prismaMock) => unknown) => fn(h.prismaMock),
  );
  h.userInvitationFindUnique.mockResolvedValue(
    pendingInvitation({
      role,
      ...(role === "INSTRUCTOR"
        ? {
            instructorLicenseNumber: "LIC-ACCEPT-1",
            instructorLicenseExpiry: new Date("2028-06-15T00:00:00.000Z"),
          }
        : {}),
    }),
  );
  h.userCreate.mockResolvedValue({
    id: "user-1",
    email: "student@school.test",
    role,
    firstName: "Alex",
    lastName: "Driver",
  });
  h.userInvitationUpdateMany.mockResolvedValue({ count: 1 });
  h.studentCreate.mockResolvedValue({ id: "stu-created-1" });
  h.studentFindFirst.mockResolvedValue(null);
  h.userInvitationFindUniqueOrThrow.mockResolvedValue({
    ...pendingInvitation({ role }),
    status: "ACCEPTED",
    acceptedAt: new Date("2026-05-22T00:00:00.000Z"),
    acceptedUserId: "user-1",
    studentId: role === "STUDENT" ? "stu-created-1" : null,
    createdBy: null,
    acceptedUser: null,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  h.instructorFindFirst.mockResolvedValue(null);
});

describe("getInvitationByToken", () => {
  it("returns invalid_token when not found", async () => {
    h.userInvitationFindUnique.mockResolvedValue(null);

    const result = await getInvitationByToken({ token: "missing-token" });

    expect(result).toEqual({
      ok: false,
      code: "invalid_token",
      status: 404,
      error: "Invalid invitation",
    });
  });

  it("returns preview without tokenHash for valid pending invite", async () => {
    h.userInvitationFindUnique.mockResolvedValue(pendingInvitation());

    const result = await getInvitationByToken({ token: rawToken });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.invitation).toEqual({
        email: "student@school.test",
        role: "STUDENT",
        organizationName: "Demo School",
        expiresAt: futureExpiry.toISOString(),
      });
      expect(result.invitation).not.toHaveProperty("tokenHash");
    }
  });

  it("blocks revoked invitations", async () => {
    h.userInvitationFindUnique.mockResolvedValue(
      pendingInvitation({ status: "REVOKED" }),
    );

    const result = await getInvitationByToken({ token: rawToken });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invitation_revoked");
    }
  });
});

describe("acceptInvitation", () => {
  it("creates student user and marks invitation ACCEPTED", async () => {
    setupSuccessfulTransaction("STUDENT");

    const result = await acceptInvitation({
      token: rawToken,
      password: "SecurePass1!",
      firstName: "Alex",
      lastName: "Driver",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user).toMatchObject({
        id: "user-1",
        email: "student@school.test",
        role: "STUDENT",
      });
      expect(result.user).not.toHaveProperty("passwordHash");
      expect(result.invitation.status).toBe("ACCEPTED");
      expect(result.invitation).not.toHaveProperty("tokenHash");
    }

    expect(h.studentCreate).toHaveBeenCalledWith({
      data: { userId: "user-1", organizationId: "org-a" },
      select: { id: true },
    });
    expect(h.userInvitationUpdateMany).toHaveBeenCalledWith({
      where: { id: "inv-1", status: "PENDING" },
      data: expect.objectContaining({
        status: "ACCEPTED",
        acceptedUserId: "user-1",
        studentId: "stu-created-1",
      }),
    });
    expect(h.instructorCreate).not.toHaveBeenCalled();
    expect(h.userCreate.mock.calls[0][0].data.organizationId).toBe("org-a");
    expect(h.userCreate.mock.calls[0][0].data.isEmailVerified).toBe(true);
    expect(h.userCreate.mock.calls[0][0].data.emailVerified).toBeInstanceOf(
      Date,
    );
    expect(h.userCreate.mock.calls[0][0].data.isApproved).toBe(true);
  });

  it("reuses Student already linked to the new user and persists studentId", async () => {
    setupSuccessfulTransaction("STUDENT");
    h.studentFindFirst.mockResolvedValue({ id: "stu-already" });

    const result = await acceptInvitation({
      token: rawToken,
      password: "SecurePass1!",
      firstName: "Alex",
      lastName: "Driver",
    });

    expect(result.ok).toBe(true);
    expect(h.studentCreate).not.toHaveBeenCalled();
    expect(h.userInvitationUpdateMany).toHaveBeenCalledWith({
      where: { id: "inv-1", status: "PENDING" },
      data: expect.objectContaining({
        studentId: "stu-already",
        acceptedUserId: "user-1",
      }),
    });
  });

  it("does not set studentId when accepting an INSTRUCTOR invitation", async () => {
    setupSuccessfulTransaction("INSTRUCTOR");
    h.userInvitationFindUnique.mockResolvedValue(
      pendingInvitation({
        role: "INSTRUCTOR",
        email: "inst@school.test",
        instructorLicenseNumber: "LIC-ACCEPT-1",
        instructorLicenseExpiry: new Date("2028-06-15T00:00:00.000Z"),
      }),
    );
    h.userCreate.mockResolvedValue({
      id: "user-2",
      email: "inst@school.test",
      role: "INSTRUCTOR",
      firstName: "Pat",
      lastName: "Teach",
    });

    const result = await acceptInvitation({
      token: rawToken,
      password: "SecurePass1!",
      firstName: "Pat",
      lastName: "Teach",
    });

    expect(result.ok).toBe(true);
    expect(h.userInvitationUpdateMany).toHaveBeenCalledWith({
      where: { id: "inv-1", status: "PENDING" },
      data: {
        status: "ACCEPTED",
        acceptedAt: expect.any(Date),
        acceptedUserId: "user-2",
      },
    });
    expect(h.userInvitationUpdateMany.mock.calls[0][0].data).not.toHaveProperty(
      "studentId",
    );
  });

  it("rolls back when invitation update fails (transaction throws)", async () => {
    setupSuccessfulTransaction("STUDENT");
    h.userInvitationUpdateMany.mockResolvedValue({ count: 0 });

    const result = await acceptInvitation({
      token: rawToken,
      password: "SecurePass1!",
      firstName: "Alex",
      lastName: "Driver",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invitation_not_pending");
    }
  });

  it("approves users created through invitation acceptance (instructor)", async () => {
    setupSuccessfulTransaction("INSTRUCTOR");
    h.userInvitationFindUnique.mockResolvedValue(
      pendingInvitation({
        role: "INSTRUCTOR",
        email: "inst@school.test",
        instructorLicenseNumber: "LIC-ACCEPT-1",
        instructorLicenseExpiry: new Date("2028-06-15T00:00:00.000Z"),
      }),
    );
    h.userCreate.mockResolvedValue({
      id: "user-2",
      email: "inst@school.test",
      role: "INSTRUCTOR",
      firstName: "Pat",
      lastName: "Teach",
    });

    const result = await acceptInvitation({
      token: rawToken,
      password: "SecurePass1!",
      firstName: "Pat",
      lastName: "Teach",
    });

    expect(result.ok).toBe(true);
    expect(h.instructorCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        instructorLicenseNumber: "LIC-ACCEPT-1",
        instructorLicenseExpiry: new Date("2028-06-15T00:00:00.000Z"),
      }),
    });
    expect(
      h.instructorCreate.mock.calls[0][0].data.instructorLicenseNumber,
    ).not.toMatch(/^INVITE-PENDING-/);
    expect(h.studentCreate).not.toHaveBeenCalled();
    expect(h.userCreate.mock.calls[0][0].data.isApproved).toBe(true);
  });

  it("fails legacy INSTRUCTOR invitation without stored license fields", async () => {
    h.userFindUnique.mockResolvedValue(null);
    h.transaction.mockImplementation(
      async (fn: (tx: typeof h.prismaMock) => unknown) => fn(h.prismaMock),
    );
    h.userInvitationFindUnique.mockResolvedValue(
      pendingInvitation({
        role: "INSTRUCTOR",
        email: "legacy@school.test",
        instructorLicenseNumber: null,
        instructorLicenseExpiry: null,
      }),
    );
    h.userCreate.mockResolvedValue({
      id: "user-legacy",
      email: "legacy@school.test",
      role: "INSTRUCTOR",
      firstName: "Legacy",
      lastName: "Invite",
    });

    const result = await acceptInvitation({
      token: rawToken,
      password: "SecurePass1!",
      firstName: "Legacy",
      lastName: "Invite",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("instructor_license_missing");
      expect(result.error).toContain("revoke");
    }
    expect(h.instructorCreate).not.toHaveBeenCalled();
  });

  it("blocks expired invitations", async () => {
    h.userInvitationFindUnique.mockResolvedValue(
      pendingInvitation({ expiresAt: pastExpiry }),
    );

    const result = await acceptInvitation({
      token: rawToken,
      password: "SecurePass1!",
      firstName: "Alex",
      lastName: "Driver",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invitation_expired");
    }
    expect(h.transaction).not.toHaveBeenCalled();
  });

  it("blocks already accepted invitations", async () => {
    h.userInvitationFindUnique.mockResolvedValue(
      pendingInvitation({ status: "ACCEPTED" }),
    );

    const result = await acceptInvitation({
      token: rawToken,
      password: "SecurePass1!",
      firstName: "Alex",
      lastName: "Driver",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invitation_already_accepted");
    }
  });

  it("blocks forbidden invitation roles", async () => {
    h.userInvitationFindUnique.mockResolvedValue(
      pendingInvitation({ role: "PLATFORM_ADMIN" }),
    );

    const result = await acceptInvitation({
      token: rawToken,
      password: "SecurePass1!",
      firstName: "Alex",
      lastName: "Driver",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invalid_invitation_role");
    }
  });

  it("blocks when user already exists", async () => {
    h.userInvitationFindUnique.mockResolvedValue(pendingInvitation());
    h.userFindUnique.mockResolvedValue({ id: "existing" });

    const result = await acceptInvitation({
      token: rawToken,
      password: "SecurePass1!",
      firstName: "Alex",
      lastName: "Driver",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("user_already_exists");
    }
    expect(h.transaction).not.toHaveBeenCalled();
  });

  it("links existing student when invitation has studentId", async () => {
    setupSuccessfulTransaction("STUDENT");
    h.userInvitationFindUnique.mockResolvedValue(
      pendingInvitation({ studentId: "stu-existing" }),
    );
    h.studentFindFirst.mockResolvedValue({
      id: "stu-existing",
      userId: null,
      firstName: "João",
      lastName: "Silva",
    });

    const result = await acceptInvitation({
      token: rawToken,
      password: "SecurePass1!",
      firstName: "Alex",
      lastName: "Driver",
    });

    expect(result.ok).toBe(true);
    expect(h.studentCreate).not.toHaveBeenCalled();
    expect(h.studentUpdate).toHaveBeenCalledWith({
      where: { id: "stu-existing" },
      data: {
        userId: "user-1",
        appAccessMode: "APP_USER",
        email: "student@school.test",
      },
    });
    expect(h.userInvitationUpdateMany).toHaveBeenCalledWith({
      where: { id: "inv-1", status: "PENDING" },
      data: expect.objectContaining({
        studentId: "stu-existing",
        acceptedUserId: "user-1",
      }),
    });
  });

  it("preserves operational firstName/lastName when already set", async () => {
    setupSuccessfulTransaction("STUDENT");
    h.userInvitationFindUnique.mockResolvedValue(
      pendingInvitation({ studentId: "stu-existing" }),
    );
    h.studentFindFirst.mockResolvedValue({
      id: "stu-existing",
      userId: null,
      firstName: "João",
      lastName: "Silva",
    });

    await acceptInvitation({
      token: rawToken,
      password: "SecurePass1!",
      firstName: "Alex",
      lastName: "Driver",
    });

    const updateData = h.studentUpdate.mock.calls[0]?.[0]?.data;
    expect(updateData).not.toHaveProperty("firstName");
    expect(updateData).not.toHaveProperty("lastName");
  });

  it("fills empty operational names from accept form", async () => {
    setupSuccessfulTransaction("STUDENT");
    h.userInvitationFindUnique.mockResolvedValue(
      pendingInvitation({ studentId: "stu-existing" }),
    );
    h.studentFindFirst.mockResolvedValue({
      id: "stu-existing",
      userId: null,
      firstName: null,
      lastName: "  ",
    });

    await acceptInvitation({
      token: rawToken,
      password: "SecurePass1!",
      firstName: "Alex",
      lastName: "Driver",
    });

    expect(h.studentUpdate.mock.calls[0][0].data).toMatchObject({
      firstName: "Alex",
      lastName: "Driver",
    });
  });

  it("fails when linked student already has userId", async () => {
    h.userFindUnique.mockResolvedValue(null);
    h.transaction.mockImplementation(
      async (fn: (tx: typeof h.prismaMock) => unknown) => fn(h.prismaMock),
    );
    h.userInvitationFindUnique.mockResolvedValue(
      pendingInvitation({ studentId: "stu-existing" }),
    );
    h.userCreate.mockResolvedValue({
      id: "user-1",
      email: "student@school.test",
      role: "STUDENT",
      firstName: "Alex",
      lastName: "Driver",
    });
    h.studentFindFirst.mockResolvedValue({
      id: "stu-existing",
      userId: "other-user",
      firstName: "João",
      lastName: "Silva",
    });

    const result = await acceptInvitation({
      token: rawToken,
      password: "SecurePass1!",
      firstName: "Alex",
      lastName: "Driver",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("student_already_linked");
      expect(result.status).toBe(409);
    }
    expect(h.studentUpdate).not.toHaveBeenCalled();
  });
});
