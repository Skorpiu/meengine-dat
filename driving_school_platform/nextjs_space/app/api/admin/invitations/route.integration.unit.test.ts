import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => {
  const listInvitationsMock = vi.fn();
  const createInvitationMock = vi.fn();
  const attemptInvitationEmailDeliveryMock = vi.fn();
  const sendEmailMock = vi.fn();
  const buildInvitationEmailMock = vi.fn();

  return {
    listInvitationsMock,
    createInvitationMock,
    attemptInvitationEmailDeliveryMock,
    sendEmailMock,
    buildInvitationEmailMock,
  };
});

vi.mock("@/lib/invitations/invitation-service", () => ({
  listInvitations: h.listInvitationsMock,
  createInvitation: h.createInvitationMock,
}));

vi.mock("@/lib/invitations/invitation-email-delivery", () => ({
  attemptInvitationEmailDelivery: h.attemptInvitationEmailDeliveryMock,
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/tenant", () => ({
  guardTenantAuthenticatedRoute: vi.fn(),
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

import { GET, POST } from "./route";
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

const invitationDto = {
  id: "inv-1",
  email: "student@school.test",
  role: "STUDENT",
  status: "PENDING",
  expiresAt: "2026-05-28T12:00:00.000Z",
  acceptedAt: null,
  revokedAt: null,
  createdAt: "2026-05-21T12:00:00.000Z",
  updatedAt: "2026-05-21T12:00:00.000Z",
  createdBy: null,
  acceptedUser: null,
};

const inviteLink =
  "https://school.example.com/invitations/accept?token=test-token";

function req(method: string, url: string, payload?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  h.listInvitationsMock.mockResolvedValue({ invitations: [invitationDto] });
  h.createInvitationMock.mockResolvedValue({
    ok: true,
    invitation: invitationDto,
    inviteLink,
    organizationName: "Demo School",
  });
  h.attemptInvitationEmailDeliveryMock.mockResolvedValue({
    attempted: true,
    ok: true,
    provider: "noop",
    noop: true,
  });
  assertUserTenantHostMock.mockResolvedValue(null);
  rejectDemoUserManagementMutationMock.mockResolvedValue(null);
});

describe("Admin Invitations API", () => {
  it("GET lists invitations scoped to session org", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await GET(
      req("GET", "http://school.example.com/api/admin/invitations") as any,
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.invitations).toHaveLength(1);
    expect(json.invitations[0]).not.toHaveProperty("tokenHash");
    expect(h.listInvitationsMock).toHaveBeenCalledWith({
      organizationId: "org-a",
    });
  });

  it("POST creates invitation, returns inviteLink and emailDelivery", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await POST(
      req("POST", "http://school.example.com/api/admin/invitations", {
        email: "student@school.test",
        role: "STUDENT",
      }) as any,
    );
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.inviteLink).toBe(inviteLink);
    expect(json.invitation).not.toHaveProperty("tokenHash");
    expect(json.emailDelivery).toEqual({
      attempted: true,
      ok: true,
      provider: "noop",
      noop: true,
    });
    expect(json).not.toHaveProperty("html");
    expect(json).not.toHaveProperty("text");

    expect(h.createInvitationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        createdByUserId: "admin-1",
        email: "student@school.test",
        role: "STUDENT",
        baseUrl: "http://school.example.com",
      }),
    );
    expect(h.attemptInvitationEmailDeliveryMock).toHaveBeenCalledWith({
      inviteLink,
      invitation: invitationDto,
      organizationName: "Demo School",
    });
  });

  it("POST blocks demo org mutations", async () => {
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
      req("POST", "http://demo.example.com/api/admin/invitations", {
        email: "student@school.test",
        role: "STUDENT",
      }) as any,
    );
    expect(res.status).toBe(403);
    expect(h.createInvitationMock).not.toHaveBeenCalled();
    expect(h.attemptInvitationEmailDeliveryMock).not.toHaveBeenCalled();
  });

  it("POST rejects forbidden roles via zod", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await POST(
      req("POST", "http://school.example.com/api/admin/invitations", {
        email: "admin@school.test",
        role: "PLATFORM_ADMIN",
      }) as any,
    );
    expect(res.status).toBe(400);
    expect(h.createInvitationMock).not.toHaveBeenCalled();
    expect(h.attemptInvitationEmailDeliveryMock).not.toHaveBeenCalled();
  });

  it("POST returns 409 user_already_exists without inviteLink or email attempt", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.createInvitationMock.mockResolvedValue({
      ok: false,
      error: "An account with this email already exists.",
      code: "user_already_exists",
      status: 409,
    });

    const res = await POST(
      req("POST", "http://school.example.com/api/admin/invitations", {
        email: "existing@school.test",
        role: "STUDENT",
      }) as any,
    );
    expect(res.status).toBe(409);

    const json = await res.json();
    expect(json.code).toBe("user_already_exists");
    expect(json.error).toBe("An account with this email already exists.");
    expect(json).not.toHaveProperty("inviteLink");
    expect(json).not.toHaveProperty("emailDelivery");
    expect(json).not.toHaveProperty("tokenHash");
    expect(h.attemptInvitationEmailDeliveryMock).not.toHaveBeenCalled();
  });

  it("POST returns service error codes without tokenHash or email attempt", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.createInvitationMock.mockResolvedValue({
      ok: false,
      error: "A pending invitation already exists for this email",
      code: "pending_invitation_exists",
      status: 409,
    });

    const res = await POST(
      req("POST", "http://school.example.com/api/admin/invitations", {
        email: "student@school.test",
        role: "STUDENT",
      }) as any,
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("pending_invitation_exists");
    expect(json).not.toHaveProperty("tokenHash");
    expect(json).not.toHaveProperty("emailDelivery");
    expect(h.attemptInvitationEmailDeliveryMock).not.toHaveBeenCalled();
  });

  it("POST still returns 201 when email delivery fails", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.attemptInvitationEmailDeliveryMock.mockResolvedValue({
      attempted: true,
      ok: false,
      provider: "resend",
      errorCode: "PROVIDER_NOT_IMPLEMENTED",
    });

    const res = await POST(
      req("POST", "http://school.example.com/api/admin/invitations", {
        email: "student@school.test",
        role: "STUDENT",
      }) as any,
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.inviteLink).toBe(inviteLink);
    expect(json.emailDelivery.ok).toBe(false);
    expect(json.emailDelivery.errorCode).toBe("PROVIDER_NOT_IMPLEMENTED");
    expect(json).not.toHaveProperty("html");
    expect(json).not.toHaveProperty("text");
  });

  it("POST with unknown provider delivery still returns 201", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.attemptInvitationEmailDeliveryMock.mockResolvedValue({
      attempted: true,
      ok: false,
      provider: "noop",
      errorCode: "PROVIDER_UNKNOWN",
    });

    const res = await POST(
      req("POST", "http://school.example.com/api/admin/invitations", {
        email: "student@school.test",
        role: "STUDENT",
      }) as any,
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.inviteLink).toBe(inviteLink);
    expect(json.emailDelivery.errorCode).toBe("PROVIDER_UNKNOWN");
  });
});
