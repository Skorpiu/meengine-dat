import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const inviteExistingStudentRecordMock = vi.fn();
  const attemptInvitationEmailDeliveryMock = vi.fn();

  return {
    inviteExistingStudentRecordMock,
    attemptInvitationEmailDeliveryMock,
  };
});

vi.mock("@/lib/students/student-record-invite-service", () => ({
  inviteExistingStudentRecord: (...args: unknown[]) =>
    h.inviteExistingStudentRecordMock(...args),
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
  });
  h.attemptInvitationEmailDeliveryMock.mockResolvedValue({
    attempted: true,
    ok: true,
    provider: "postmark",
  });
});

describe("POST /api/admin/students/[id]/invite", () => {
  it("returns invitation, inviteLink, and emailDelivery", async () => {
    const res = await POST(req({ email: "joao@school.test" }) as any, {
      params: { id: "stu-1" },
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
  });

  it("returns 401 for non SUPER_ADMIN", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "INSTRUCTOR", organizationId: "org-a" },
    });

    const res = await POST(req() as any, { params: { id: "stu-1" } });
    expect(res.status).toBe(401);
  });

  it("forwards service errors with code", async () => {
    h.inviteExistingStudentRecordMock.mockResolvedValue({
      ok: false,
      error: "This student record is already linked to an account.",
      code: "student_already_linked",
      status: 409,
    });

    const res = await POST(req() as any, { params: { id: "stu-1" } });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("student_already_linked");
  });
});
