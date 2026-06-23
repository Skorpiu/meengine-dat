import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findFirstMock = vi.fn();
  const findManyMock = vi.fn();
  const createMock = vi.fn();
  const updateMock = vi.fn();
  const countMock = vi.fn();
  const userFindUniqueMock = vi.fn();
  const organizationFindUniqueMock = vi.fn();
  const instructorFindFirstMock = vi.fn();
  const studentFindFirstMock = vi.fn();
  const studentUpdateMock = vi.fn();
  const transactionMock = vi.fn();

  const txMock = {
    userInvitation: {
      findFirst: findFirstMock,
      findMany: findManyMock,
      create: createMock,
      update: updateMock,
      count: countMock,
    },
    student: {
      findFirst: studentFindFirstMock,
      update: studentUpdateMock,
    },
  };

  return {
    findFirstMock,
    findManyMock,
    createMock,
    updateMock,
    countMock,
    userFindUniqueMock,
    organizationFindUniqueMock,
    instructorFindFirstMock,
    studentFindFirstMock,
    studentUpdateMock,
    transactionMock,
    txMock,
    prismaMock: {
      user: {
        findUnique: userFindUniqueMock,
      },
      organization: {
        findUnique: organizationFindUniqueMock,
      },
      instructor: {
        findFirst: instructorFindFirstMock,
      },
      userInvitation: {
        findFirst: findFirstMock,
        findMany: findManyMock,
        create: createMock,
        update: updateMock,
      },
      $transaction: transactionMock,
    },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
  db: h.prismaMock,
}));

import {
  createInvitation,
  listInvitations,
  revokeInvitation,
} from "./invitation-service";
import { mapInvitationDto } from "./invitation-dto";

const baseDate = new Date("2026-05-21T12:00:00.000Z");

function sampleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    organizationId: "org-a",
    studentId: null,
    email: "student@school.test",
    role: "STUDENT",
    tokenHash: "secret-hash-never-in-dto",
    status: "PENDING",
    expiresAt: new Date("2026-05-28T12:00:00.000Z"),
    acceptedAt: null,
    revokedAt: null,
    createdByUserId: "admin-1",
    acceptedUserId: null,
    createdAt: baseDate,
    updatedAt: baseDate,
    createdBy: {
      id: "admin-1",
      email: "admin@school.test",
      firstName: "Ada",
      lastName: "Min",
    },
    acceptedUser: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  h.userFindUniqueMock.mockResolvedValue(null);
  h.findFirstMock.mockResolvedValue(null);
  h.findManyMock.mockResolvedValue([]);
  h.countMock.mockResolvedValue(0);
  h.studentFindFirstMock.mockResolvedValue(null);
  h.studentUpdateMock.mockResolvedValue({});
  h.transactionMock.mockImplementation(
    async (fn: (tx: typeof h.txMock) => unknown) => fn(h.txMock),
  );
  h.organizationFindUniqueMock.mockResolvedValue({ name: "Demo School" });
  h.instructorFindFirstMock.mockResolvedValue(null);
});

describe("createInvitation", () => {
  it("normalizes email to lowercase trimmed", async () => {
    h.createMock.mockResolvedValue(sampleRow({ email: "student@school.test" }));

    await createInvitation({
      organizationId: "org-a",
      createdByUserId: "admin-1",
      email: "  Student@School.TEST ",
      role: "STUDENT",
      baseUrl: "https://school.example.com",
    });

    expect(h.createMock.mock.calls[0][0].data.email).toBe(
      "student@school.test",
    );
  });

  it("blocks non-invitatable roles at service layer", async () => {
    const result = await createInvitation({
      organizationId: "org-a",
      createdByUserId: "admin-1",
      email: "admin@school.test",
      // @ts-expect-error — runtime guard for forbidden enum values
      role: "PLATFORM_ADMIN",
      baseUrl: "https://school.example.com",
    });

    expect(result).toEqual({
      ok: false,
      error: "Invalid role for invitation",
      code: "invalid_role",
      status: 400,
    });
    expect(h.createMock).not.toHaveBeenCalled();
  });

  it("blocks when a user with the same normalized email already exists", async () => {
    h.userFindUniqueMock.mockResolvedValue({ id: "user-1" });

    const result = await createInvitation({
      organizationId: "org-a",
      createdByUserId: "admin-1",
      email: "  Student@School.TEST ",
      role: "STUDENT",
      baseUrl: "https://school.example.com",
    });

    expect(result).toEqual({
      ok: false,
      error: "An account with this email already exists.",
      code: "user_already_exists",
      status: 409,
    });
    expect(h.userFindUniqueMock).toHaveBeenCalledWith({
      where: { email: "student@school.test" },
      select: { id: true },
    });
    expect(h.findFirstMock).not.toHaveBeenCalled();
    expect(h.createMock).not.toHaveBeenCalled();
  });

  it("blocks duplicate pending invitation for same org/email", async () => {
    h.findFirstMock.mockResolvedValue({ id: "existing" });

    const result = await createInvitation({
      organizationId: "org-a",
      createdByUserId: "admin-1",
      email: "student@school.test",
      role: "STUDENT",
      baseUrl: "https://school.example.com",
    });

    expect(result).toEqual({
      ok: false,
      error: "A pending invitation already exists for this email",
      code: "pending_invitation_exists",
      status: 409,
    });
    expect(h.createMock).not.toHaveBeenCalled();
  });

  it("returns inviteLink without tokenHash in invitation DTO", async () => {
    h.createMock.mockResolvedValue(sampleRow());

    const result = await createInvitation({
      organizationId: "org-a",
      createdByUserId: "admin-1",
      email: "student@school.test",
      role: "INSTRUCTOR",
      baseUrl: "https://school.example.com/",
      instructorLicenseNumber: "LIC-12345",
      instructorLicenseExpiry: "2027-06-15",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.inviteLink).toMatch(
      /^https:\/\/school\.example\.com\/invitations\/accept\?token=/,
    );
    expect(result.invitation).not.toHaveProperty("tokenHash");
    expect(h.createMock.mock.calls[0][0].data.tokenHash).toMatch(
      /^[a-f0-9]{64}$/,
    );
    expect(h.createMock.mock.calls[0][0].data.role).toBe("INSTRUCTOR");
    expect(h.createMock.mock.calls[0][0].data.instructorLicenseNumber).toBe(
      "LIC-12345",
    );
    expect(
      h.createMock.mock.calls[0][0].data.instructorLicenseExpiry,
    ).toBeInstanceOf(Date);
    expect(result.organizationName).toBe("Demo School");
  });

  it("persists instructor license fields for INSTRUCTOR invitations", async () => {
    h.createMock.mockResolvedValue(
      sampleRow({
        role: "INSTRUCTOR",
        email: "inst@school.test",
        instructorLicenseNumber: "LIC-999",
        instructorLicenseExpiry: new Date("2028-01-01T00:00:00.000Z"),
      }),
    );

    const result = await createInvitation({
      organizationId: "org-a",
      createdByUserId: "admin-1",
      email: "inst@school.test",
      role: "INSTRUCTOR",
      baseUrl: "https://school.example.com",
      instructorLicenseNumber: "LIC-999",
      instructorLicenseExpiry: "2028-01-01",
    });

    expect(result.ok).toBe(true);
    expect(h.instructorFindFirstMock).toHaveBeenCalledWith({
      where: { instructorLicenseNumber: "LIC-999" },
      select: { id: true },
    });
    expect(h.createMock.mock.calls[0][0].data).toMatchObject({
      instructorLicenseNumber: "LIC-999",
    });
  });

  it("blocks INSTRUCTOR invitation when license number already exists", async () => {
    h.instructorFindFirstMock.mockResolvedValue({ id: "inst-existing" });

    const result = await createInvitation({
      organizationId: "org-a",
      createdByUserId: "admin-1",
      email: "inst@school.test",
      role: "INSTRUCTOR",
      baseUrl: "https://school.example.com",
      instructorLicenseNumber: "LIC-DUP",
      instructorLicenseExpiry: "2028-01-01",
    });

    expect(result).toEqual({
      ok: false,
      error: "An instructor with this license number already exists",
      code: "instructor_license_exists",
      status: 409,
    });
    expect(h.createMock).not.toHaveBeenCalled();
  });

  it("blocks INSTRUCTOR invitation without license fields", async () => {
    const result = await createInvitation({
      organizationId: "org-a",
      createdByUserId: "admin-1",
      email: "inst@school.test",
      role: "INSTRUCTOR",
      baseUrl: "https://school.example.com",
    });

    expect(result).toEqual({
      ok: false,
      error: "Instructor license number and expiration date are required",
      code: "invalid_instructor_license",
      status: 400,
    });
    expect(h.createMock).not.toHaveBeenCalled();
  });

  it("uses transactional client when tx is provided", async () => {
    const txUserFindUnique = vi.fn().mockResolvedValue(null);
    const txFindFirst = vi.fn().mockResolvedValue(null);
    const txOrgFindUnique = vi.fn().mockResolvedValue({ name: "Tx School" });
    const txCreate = vi.fn().mockResolvedValue(sampleRow());

    const tx = {
      user: { findUnique: txUserFindUnique },
      organization: { findUnique: txOrgFindUnique },
      userInvitation: { findFirst: txFindFirst, create: txCreate },
    };

    const result = await createInvitation({
      organizationId: "org-a",
      createdByUserId: "admin-1",
      email: "student@school.test",
      role: "STUDENT",
      baseUrl: "https://school.example.com",
      tx: tx as never,
    });

    expect(result.ok).toBe(true);
    expect(txUserFindUnique).toHaveBeenCalled();
    expect(txFindFirst).toHaveBeenCalled();
    expect(txOrgFindUnique).toHaveBeenCalled();
    expect(txCreate).toHaveBeenCalled();
    expect(h.userFindUniqueMock).not.toHaveBeenCalled();
    expect(h.findFirstMock).not.toHaveBeenCalled();
    expect(h.organizationFindUniqueMock).not.toHaveBeenCalled();
    expect(h.createMock).not.toHaveBeenCalled();
  });
});

describe("mapInvitationDto", () => {
  it("never includes tokenHash", () => {
    const dto = mapInvitationDto(sampleRow() as any);
    expect(dto).not.toHaveProperty("tokenHash");
    expect(JSON.stringify(dto)).not.toContain("secret-hash");
    expect(dto.studentId).toBeNull();
  });

  it("maps studentId when present", () => {
    const dto = mapInvitationDto(sampleRow({ studentId: "stu-1" }) as any);
    expect(dto.studentId).toBe("stu-1");
  });
});

describe("listInvitations", () => {
  it("maps rows without tokenHash", async () => {
    h.findManyMock.mockResolvedValue([sampleRow()]);

    const result = await listInvitations({ organizationId: "org-a" });

    expect(result.invitations).toHaveLength(1);
    expect(result.invitations[0]).not.toHaveProperty("tokenHash");
    expect(h.findManyMock.mock.calls[0][0].where.organizationId).toBe("org-a");
  });
});

describe("revokeInvitation", () => {
  it("revokes pending invitation scoped to organization", async () => {
    h.findFirstMock.mockResolvedValue(sampleRow());
    h.updateMock.mockResolvedValue(
      sampleRow({
        status: "REVOKED",
        revokedAt: new Date("2026-05-22T00:00:00.000Z"),
      }),
    );

    const result = await revokeInvitation({
      organizationId: "org-a",
      invitationId: "inv-1",
      revokedByUserId: "admin-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.invitation.status).toBe("REVOKED");
      expect(result.invitation).not.toHaveProperty("tokenHash");
      expect(result.invitation.studentId).toBeNull();
    }
    expect(h.findFirstMock.mock.calls[0][0].where).toEqual({
      id: "inv-1",
      organizationId: "org-a",
    });
    expect(h.studentUpdateMock).not.toHaveBeenCalled();
  });

  it("resets linked student to MANUAL_ONLY when INVITED and no other pending invite", async () => {
    h.findFirstMock.mockResolvedValue(sampleRow({ studentId: "stu-1" }));
    h.updateMock.mockResolvedValue(
      sampleRow({
        studentId: "stu-1",
        status: "REVOKED",
        revokedAt: new Date("2026-05-22T00:00:00.000Z"),
      }),
    );
    h.countMock.mockResolvedValue(0);
    h.studentFindFirstMock.mockResolvedValue({
      userId: null,
      appAccessMode: "INVITED",
    });

    const result = await revokeInvitation({
      organizationId: "org-a",
      invitationId: "inv-1",
    });

    expect(result.ok).toBe(true);
    expect(h.studentUpdateMock).toHaveBeenCalledWith({
      where: { id: "stu-1" },
      data: { appAccessMode: "MANUAL_ONLY" },
    });
  });

  it("does not reset student for standalone invitation without studentId", async () => {
    h.findFirstMock.mockResolvedValue(sampleRow({ studentId: null }));
    h.updateMock.mockResolvedValue(
      sampleRow({
        status: "REVOKED",
        revokedAt: new Date("2026-05-22T00:00:00.000Z"),
      }),
    );

    await revokeInvitation({
      organizationId: "org-a",
      invitationId: "inv-1",
    });

    expect(h.countMock).not.toHaveBeenCalled();
    expect(h.studentFindFirstMock).not.toHaveBeenCalled();
    expect(h.studentUpdateMock).not.toHaveBeenCalled();
  });

  it("does not reset student when already APP_USER", async () => {
    h.findFirstMock.mockResolvedValue(sampleRow({ studentId: "stu-1" }));
    h.updateMock.mockResolvedValue(
      sampleRow({ studentId: "stu-1", status: "REVOKED" }),
    );
    h.countMock.mockResolvedValue(0);
    h.studentFindFirstMock.mockResolvedValue({
      userId: "user-1",
      appAccessMode: "APP_USER",
    });

    await revokeInvitation({
      organizationId: "org-a",
      invitationId: "inv-1",
    });

    expect(h.studentUpdateMock).not.toHaveBeenCalled();
  });

  it("does not reset student when another pending invitation remains", async () => {
    h.findFirstMock.mockResolvedValue(sampleRow({ studentId: "stu-1" }));
    h.updateMock.mockResolvedValue(
      sampleRow({ studentId: "stu-1", status: "REVOKED" }),
    );
    h.countMock.mockResolvedValue(1);

    await revokeInvitation({
      organizationId: "org-a",
      invitationId: "inv-1",
    });

    expect(h.studentFindFirstMock).not.toHaveBeenCalled();
    expect(h.studentUpdateMock).not.toHaveBeenCalled();
  });

  it("returns not_found when invitation is outside org scope", async () => {
    h.findFirstMock.mockResolvedValue(null);

    const result = await revokeInvitation({
      organizationId: "org-a",
      invitationId: "inv-other",
    });

    expect(result).toEqual({
      ok: false,
      error: "Invitation not found",
      code: "invitation_not_found",
      status: 404,
    });
    expect(h.updateMock).not.toHaveBeenCalled();
  });

  it("blocks revoke when status is not PENDING", async () => {
    h.findFirstMock.mockResolvedValue(sampleRow({ status: "ACCEPTED" }));

    const result = await revokeInvitation({
      organizationId: "org-a",
      invitationId: "inv-1",
    });

    expect(result).toEqual({
      ok: false,
      error: "Only pending invitations can be revoked",
      code: "invitation_not_pending",
      status: 400,
    });
    expect(h.updateMock).not.toHaveBeenCalled();
  });
});
