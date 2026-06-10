import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  changeInvitationEmailMock: vi.fn(),
}));

vi.mock("@/lib/invitations/invitation-email-update-service", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/invitations/invitation-email-update-service")
  >("@/lib/invitations/invitation-email-update-service");
  return {
    ...actual,
    changeInvitationEmail: (...args: unknown[]) =>
      h.changeInvitationEmailMock(...args),
  };
});

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
import { INVITATION_EMAIL_UPDATE_CODE } from "@/lib/invitations/invitation-email-update-service";

const getServerSessionMock = getServerSession as unknown as ReturnType<
  typeof vi.fn
>;
const assertUserTenantHostMock = assertUserTenantHost as unknown as ReturnType<
  typeof vi.fn
>;
const rejectDemoMock =
  rejectDemoUserManagementMutation as unknown as ReturnType<typeof vi.fn>;

const updatedInvitation = {
  id: "inv-1",
  studentId: null,
  email: "new@school.test",
  role: "INSTRUCTOR",
  status: "PENDING",
  expiresAt: "2026-06-09T12:00:00.000Z",
  acceptedAt: null,
  revokedAt: null,
  createdAt: "2026-05-21T12:00:00.000Z",
  updatedAt: "2026-06-09T12:00:00.000Z",
  createdBy: null,
  acceptedUser: null,
};

function req(body?: unknown): Request {
  return new Request(
    "http://school.example.com/api/admin/invitations/inv-1/change-email",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
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
  h.changeInvitationEmailMock.mockResolvedValue({
    ok: true,
    invitation: updatedInvitation,
    inviteLink: "http://school.example.com/invitations/accept?token=new-token",
  });
});

describe("POST /api/admin/invitations/[id]/change-email", () => {
  it("returns invitation and inviteLink on success", async () => {
    const res = await POST(req({ newEmail: "new@school.test" }) as any, {
      params: { id: "inv-1" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invitation.email).toBe("new@school.test");
    expect(body.inviteLink).toContain("token=");
    expect(body.invitation).not.toHaveProperty("tokenHash");
    expect(h.changeInvitationEmailMock).toHaveBeenCalledWith({
      organizationId: "org-a",
      invitationId: "inv-1",
      newEmail: "new@school.test",
      baseUrl: "http://school.example.com",
    });
  });

  it("returns 401 for non SUPER_ADMIN", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "INSTRUCTOR", organizationId: "org-a" },
    });

    const res = await POST(req({ newEmail: "new@school.test" }) as any, {
      params: { id: "inv-1" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when invitation not found in tenant", async () => {
    h.changeInvitationEmailMock.mockResolvedValue({
      ok: false,
      notFound: true,
    });

    const res = await POST(req({ newEmail: "new@school.test" }) as any, {
      params: { id: "inv-other" },
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe(INVITATION_EMAIL_UPDATE_CODE.INVITATION_NOT_FOUND);
  });

  it("returns stable 404 for linked_student_not_found", async () => {
    h.changeInvitationEmailMock.mockResolvedValue({
      ok: false,
      notFound: false,
      code: INVITATION_EMAIL_UPDATE_CODE.LINKED_STUDENT_NOT_FOUND,
      error: "Linked student record not found.",
      status: 404,
    });

    const res = await POST(req({ newEmail: "new@school.test" }) as any, {
      params: { id: "inv-1" },
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("linked_student_not_found");
  });

  it("returns stable 409 for student_already_linked", async () => {
    h.changeInvitationEmailMock.mockResolvedValue({
      ok: false,
      notFound: false,
      code: INVITATION_EMAIL_UPDATE_CODE.STUDENT_ALREADY_LINKED,
      error:
        "This student already has an app account. Use Student Change email instead.",
      status: 409,
    });

    const res = await POST(req({ newEmail: "new@school.test" }) as any, {
      params: { id: "inv-1" },
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("student_already_linked");
  });

  it("returns stable 409 for student_email_already_in_use", async () => {
    h.changeInvitationEmailMock.mockResolvedValue({
      ok: false,
      notFound: false,
      code: INVITATION_EMAIL_UPDATE_CODE.STUDENT_EMAIL_ALREADY_IN_USE,
      error: "A student record with this email already exists.",
      status: 409,
    });

    const res = await POST(req({ newEmail: "taken@school.test" }) as any, {
      params: { id: "inv-1" },
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("student_email_already_in_use");
  });

  it("returns stable 409 for user_already_exists", async () => {
    h.changeInvitationEmailMock.mockResolvedValue({
      ok: false,
      notFound: false,
      code: INVITATION_EMAIL_UPDATE_CODE.USER_ALREADY_EXISTS,
      error: "An account with this email already exists.",
      status: 409,
    });

    const res = await POST(req({ newEmail: "taken@school.test" }) as any, {
      params: { id: "inv-1" },
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("user_already_exists");
  });

  it("returns 400 for invalid email body", async () => {
    const res = await POST(req({ newEmail: "not-an-email" }) as any, {
      params: { id: "inv-1" },
    });
    expect(res.status).toBe(400);
    expect(h.changeInvitationEmailMock).not.toHaveBeenCalled();
  });

  it("blocks demo org mutations", async () => {
    rejectDemoMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "demo_restricted_action" }), {
        status: 403,
      }),
    );

    const res = await POST(req({ newEmail: "new@school.test" }) as any, {
      params: { id: "inv-1" },
    });
    expect(res.status).toBe(403);
    expect(h.changeInvitationEmailMock).not.toHaveBeenCalled();
  });
});
