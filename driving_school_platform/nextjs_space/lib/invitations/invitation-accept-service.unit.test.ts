import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const userInvitationFindUnique = vi.fn();
  const userInvitationUpdateMany = vi.fn();
  const userInvitationFindUniqueOrThrow = vi.fn();
  const userFindUnique = vi.fn();
  const userCreate = vi.fn();
  const studentCreate = vi.fn();
  const instructorCreate = vi.fn();
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
    student: { create: studentCreate },
    instructor: { create: instructorCreate },
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
    instructorCreate,
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
  h.userInvitationFindUnique.mockResolvedValue(pendingInvitation({ role }));
  h.userCreate.mockResolvedValue({
    id: "user-1",
    email: "student@school.test",
    role,
    firstName: "Alex",
    lastName: "Driver",
  });
  h.userInvitationUpdateMany.mockResolvedValue({ count: 1 });
  h.userInvitationFindUniqueOrThrow.mockResolvedValue({
    ...pendingInvitation({ role }),
    status: "ACCEPTED",
    acceptedAt: new Date("2026-05-22T00:00:00.000Z"),
    acceptedUserId: "user-1",
    createdBy: null,
    acceptedUser: null,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
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
    });
    expect(h.instructorCreate).not.toHaveBeenCalled();
    expect(h.userCreate.mock.calls[0][0].data.organizationId).toBe("org-a");
  });

  it("creates instructor profile for instructor invites", async () => {
    setupSuccessfulTransaction("INSTRUCTOR");
    h.userInvitationFindUnique.mockResolvedValue(
      pendingInvitation({ role: "INSTRUCTOR", email: "inst@school.test" }),
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
    expect(h.instructorCreate).toHaveBeenCalled();
    expect(h.studentCreate).not.toHaveBeenCalled();
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
});
