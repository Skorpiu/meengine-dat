import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const inviteExistingStudentRecordMock = vi.fn();
  const attemptInvitationEmailDeliveryMock = vi.fn();
  const writeStudentInviteAuditEventMock = vi.fn();

  return {
    inviteExistingStudentRecordMock,
    attemptInvitationEmailDeliveryMock,
    writeStudentInviteAuditEventMock,
  };
});

vi.mock("@/lib/students/student-record-invite-service", () => ({
  inviteExistingStudentRecord: (...args: unknown[]) =>
    h.inviteExistingStudentRecordMock(...args),
}));

vi.mock("@/lib/audit/student-audit", () => ({
  writeStudentInviteAuditEvent: (...args: unknown[]) =>
    h.writeStudentInviteAuditEventMock(...args),
}));

vi.mock("@/lib/invitations/invitation-email-delivery", () => ({
  attemptInvitationEmailDelivery: (...args: unknown[]) =>
    h.attemptInvitationEmailDeliveryMock(...args),
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
const rejectDemoMock =
  rejectDemoUserManagementMutation as unknown as ReturnType<typeof vi.fn>;

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

function req(payload?: unknown): Request {
  return new Request(
    "http://school.example.com/api/admin/students/stu-1/invite",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload !== undefined ? JSON.stringify(payload) : "{}",
    },
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  getServerSessionMock.mockResolvedValue({
    user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
  });
  assertUserTenantHostMock.mockResolvedValue(null);
  rejectDemoMock.mockResolvedValue(null);
  h.inviteExistingStudentRecordMock.mockResolvedValue({
    ok: true,
    invitation: invitationDto,
    inviteLink: "https://school.example.com/invitations/accept?token=abc",
    organizationName: "Demo School",
    audit: {
      previousAppAccessMode: "MANUAL_ONLY",
      invitationRole: "STUDENT",
      invitationStatus: "PENDING",
    },
  });
  h.writeStudentInviteAuditEventMock.mockResolvedValue({
    ok: true,
    id: "audit-invite-1",
  });
  h.attemptInvitationEmailDeliveryMock.mockResolvedValue({
    attempted: true,
    ok: true,
    provider: "postmark",
  });
});

describe("POST /api/admin/students/[id]/invite", () => {
  it("returns invitation, inviteLink, and emailDelivery", async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: "admin-1",
        role: "SUPER_ADMIN",
        organizationId: "org-a",
        email: "admin@school.test",
      },
    });

    const res = await POST(req({ email: "joao@school.test" }) as any, {
      params: Promise.resolve({ id: "stu-1" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.invitation).toEqual(invitationDto);
    expect(body.data.inviteLink).toContain("/invitations/accept?token=");
    expect(body.data.emailDelivery).toMatchObject({
      attempted: true,
      ok: true,
    });
    expect(h.inviteExistingStudentRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        studentId: "stu-1",
        email: "joao@school.test",
      }),
    );
    expect(h.writeStudentInviteAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        actor: {
          userId: "admin-1",
          role: "SUPER_ADMIN",
          email: "admin@school.test",
        },
        studentId: "stu-1",
        invitationRole: "STUDENT",
        invitationStatus: "PENDING",
        previousAppAccessMode: "MANUAL_ONLY",
      }),
    );

    const auditPayload = JSON.stringify(
      h.writeStudentInviteAuditEventMock.mock.calls[0]?.[0],
    );
    expect(auditPayload).not.toContain("token");
    expect(auditPayload).not.toContain("tokenHash");
    expect(auditPayload).not.toContain("inviteLink");
    expect(auditPayload).not.toContain("joao@school.test");
  });

  it("returns 401 for non SUPER_ADMIN", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "INSTRUCTOR", organizationId: "org-a" },
    });

    const res = await POST(req() as any, {
      params: Promise.resolve({ id: "stu-1" }),
    });
    expect(res.status).toBe(401);
    expect(h.writeStudentInviteAuditEventMock).not.toHaveBeenCalled();
  });

  it("forwards service errors with code", async () => {
    h.inviteExistingStudentRecordMock.mockResolvedValue({
      ok: false,
      error: "This student record is already linked to an account.",
      code: "student_already_linked",
      status: 409,
    });

    const res = await POST(req() as any, {
      params: Promise.resolve({ id: "stu-1" }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("student_already_linked");
    expect(h.writeStudentInviteAuditEventMock).not.toHaveBeenCalled();
  });

  it("POST still returns 201 when audit write fails", async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: "admin-1",
        role: "SUPER_ADMIN",
        organizationId: "org-a",
        email: "admin@school.test",
      },
    });
    h.writeStudentInviteAuditEventMock.mockResolvedValue({
      ok: false,
      error: "db_down",
    });

    const res = await POST(req({ email: "joao@school.test" }) as any, {
      params: Promise.resolve({ id: "stu-1" }),
    });

    expect(res.status).toBe(201);
    expect(h.writeStudentInviteAuditEventMock).toHaveBeenCalled();
    expect(h.inviteExistingStudentRecordMock).toHaveBeenCalled();
  });

  it("blocks demo org via user-management guard", async () => {
    rejectDemoMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Demo restricted",
          code: "demo_restricted_action",
        }),
        { status: 403 },
      ),
    );

    const res = await POST(req({ email: "joao@school.test" }) as any, {
      params: Promise.resolve({ id: "stu-1" }),
    });

    expect(res.status).toBe(403);
    expect(h.inviteExistingStudentRecordMock).not.toHaveBeenCalled();
    expect(h.writeStudentInviteAuditEventMock).not.toHaveBeenCalled();
  });
});
