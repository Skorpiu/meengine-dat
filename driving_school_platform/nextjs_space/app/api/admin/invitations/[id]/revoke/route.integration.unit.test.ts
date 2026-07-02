import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const revokeInvitationMock = vi.fn();
  const writeInvitationAuditEventMock = vi.fn();
  return { revokeInvitationMock, writeInvitationAuditEventMock };
});

vi.mock("@/lib/invitations/invitation-service", () => ({
  revokeInvitation: h.revokeInvitationMock,
}));

vi.mock("@/lib/audit/invitation-audit", () => ({
  writeInvitationAuditEvent: h.writeInvitationAuditEventMock,
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/users/user-route-access", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/users/user-route-access")
  >("@/lib/users/user-route-access");
  return {
    ...actual,
    assertUserTenantHost: vi.fn(),
    rejectDemoUserManagementMutation: vi.fn(),
  };
});

import { POST } from "./route";
import { getServerSession } from "next-auth";
import {
  assertUserTenantHost,
  rejectDemoUserManagementMutation,
} from "@/lib/users/user-route-access";

const getServerSessionMock = getServerSession as unknown as ReturnType<
  typeof vi.fn
>;
const assertUserTenantHostMock = assertUserTenantHost as unknown as ReturnType<
  typeof vi.fn
>;
const rejectDemoUserManagementMutationMock =
  rejectDemoUserManagementMutation as unknown as ReturnType<typeof vi.fn>;

const revokedDto = {
  id: "inv-1",
  studentId: "stu-1",
  email: "student@school.test",
  role: "STUDENT",
  status: "REVOKED",
  expiresAt: "2026-05-28T12:00:00.000Z",
  acceptedAt: null,
  revokedAt: "2026-05-22T00:00:00.000Z",
  createdAt: "2026-05-21T12:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
  createdBy: null,
  acceptedUser: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  h.revokeInvitationMock.mockResolvedValue({
    ok: true,
    invitation: revokedDto,
  });
  h.writeInvitationAuditEventMock.mockResolvedValue({
    ok: true,
    id: "audit-1",
  });
  assertUserTenantHostMock.mockResolvedValue(null);
  rejectDemoUserManagementMutationMock.mockResolvedValue(null);
});

describe("Admin Invitation Revoke API", () => {
  it("POST revokes pending invitation for session org", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await POST(
      new Request(
        "http://school.example.com/api/admin/invitations/inv-1/revoke",
        {
          method: "POST",
        },
      ) as any,
      { params: { id: "inv-1" } },
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.invitation.status).toBe("REVOKED");
    expect(json.invitation).not.toHaveProperty("tokenHash");
    expect(h.revokeInvitationMock).toHaveBeenCalledWith({
      organizationId: "org-a",
      invitationId: "inv-1",
      revokedByUserId: "admin-1",
    });
    expect(h.writeInvitationAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "invitation.revoke",
        organizationId: "org-a",
        actor: expect.objectContaining({
          userId: "admin-1",
          role: "SUPER_ADMIN",
        }),
        invitation: revokedDto,
        requestContext: expect.objectContaining({
          requestMethod: "POST",
          requestPath: "/api/admin/invitations/inv-1/revoke",
        }),
      }),
    );

    const auditPayload = JSON.stringify(
      h.writeInvitationAuditEventMock.mock.calls[0]?.[0],
    );
    expect(auditPayload).not.toContain("tokenHash");
    expect(auditPayload).not.toContain("password");
  });

  it("POST blocks demo org revoke", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-demo" },
    });
    rejectDemoUserManagementMutationMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Demo mutations disabled",
          code: "demo_mutation_disabled",
        }),
        { status: 403 },
      ),
    );

    const res = await POST(
      new Request(
        "http://demo.example.com/api/admin/invitations/inv-1/revoke",
        {
          method: "POST",
        },
      ) as any,
      { params: { id: "inv-1" } },
    );
    expect(res.status).toBe(403);
    expect(h.revokeInvitationMock).not.toHaveBeenCalled();
    expect(h.writeInvitationAuditEventMock).not.toHaveBeenCalled();
  });

  it("POST surfaces not_found when service cannot scope invitation", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.revokeInvitationMock.mockResolvedValue({
      ok: false,
      error: "Invitation not found",
      code: "invitation_not_found",
      status: 404,
    });

    const res = await POST(
      new Request(
        "http://school.example.com/api/admin/invitations/inv-other/revoke",
        {
          method: "POST",
        },
      ) as any,
      { params: { id: "inv-other" } },
    );
    expect(res.status).toBe(404);
    expect(h.revokeInvitationMock).toHaveBeenCalledWith({
      organizationId: "org-a",
      invitationId: "inv-other",
      revokedByUserId: "admin-1",
    });
    expect(h.writeInvitationAuditEventMock).not.toHaveBeenCalled();
  });

  it("POST still returns 200 when audit write fails", async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: "admin-1",
        role: "SUPER_ADMIN",
        organizationId: "org-a",
        email: "admin@school.test",
      },
    });
    h.writeInvitationAuditEventMock.mockResolvedValue({
      ok: false,
      error: "db_down",
    });

    const res = await POST(
      new Request(
        "http://school.example.com/api/admin/invitations/inv-1/revoke",
        {
          method: "POST",
        },
      ) as any,
      { params: { id: "inv-1" } },
    );

    expect(res.status).toBe(200);
    expect(h.writeInvitationAuditEventMock).toHaveBeenCalled();
  });
});
