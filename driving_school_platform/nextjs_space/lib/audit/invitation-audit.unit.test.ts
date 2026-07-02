import { describe, expect, it, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const writeAuditEventMock = vi.fn();
  return { writeAuditEventMock };
});

vi.mock("@/lib/audit/audit-log-service", () => ({
  writeAuditEvent: h.writeAuditEventMock,
}));

import {
  buildInvitationAuditMetadata,
  writeInvitationAuditEvent,
} from "@/lib/audit/invitation-audit";
import { UserRole } from "@prisma/client";

const invitation = {
  id: "inv-1",
  studentId: "stu-1",
  email: "student@school.test",
  role: "STUDENT" as const,
  status: "PENDING" as const,
  expiresAt: "2026-05-28T12:00:00.000Z",
  acceptedAt: null,
  revokedAt: null,
  createdAt: "2026-05-21T12:00:00.000Z",
  updatedAt: "2026-05-21T12:00:00.000Z",
  createdBy: null,
  acceptedUser: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  h.writeAuditEventMock.mockResolvedValue({ ok: true, id: "audit_1" });
});

describe("buildInvitationAuditMetadata", () => {
  it("includes role, status, and linked student id only", () => {
    expect(buildInvitationAuditMetadata(invitation)).toEqual({
      role: "STUDENT",
      status: "PENDING",
      studentId: "stu-1",
    });
  });

  it("omits studentId when not linked", () => {
    expect(
      buildInvitationAuditMetadata({
        ...invitation,
        studentId: null,
      }),
    ).toEqual({
      role: "STUDENT",
      status: "PENDING",
    });
  });
});

describe("writeInvitationAuditEvent", () => {
  it("writes invitation.create with tenant and actor context", async () => {
    await writeInvitationAuditEvent({
      action: "invitation.create",
      organizationId: "org-a",
      actor: {
        userId: "admin-1",
        role: UserRole.SUPER_ADMIN,
        email: "admin@school.test",
      },
      invitation,
      requestContext: {
        requestId: "req-1",
        ipAddress: "203.0.113.10",
      },
    });

    expect(h.writeAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        actorUserId: "admin-1",
        actorRole: UserRole.SUPER_ADMIN,
        actorEmail: "admin@school.test",
        action: "invitation.create",
        entityType: "UserInvitation",
        entityId: "inv-1",
        targetUserId: null,
        metadata: {
          role: "STUDENT",
          status: "PENDING",
          studentId: "stu-1",
        },
        requestId: "req-1",
        ipAddress: "203.0.113.10",
      }),
      undefined,
    );

    const payload = JSON.stringify(h.writeAuditEventMock.mock.calls[0]?.[0]);
    expect(payload).not.toContain("tokenHash");
    expect(payload).not.toContain("password");
  });

  it("writes invitation.revoke with status diff metadata", async () => {
    await writeInvitationAuditEvent({
      action: "invitation.revoke",
      organizationId: "org-a",
      actor: {
        userId: "admin-1",
        role: UserRole.SUPER_ADMIN,
      },
      invitation: {
        ...invitation,
        status: "REVOKED",
        revokedAt: "2026-05-22T00:00:00.000Z",
      },
    });

    expect(h.writeAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "invitation.revoke",
        oldValues: { status: "PENDING" },
        newValues: { status: "REVOKED" },
      }),
      undefined,
    );
  });
});
