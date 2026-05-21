import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const getInvitationByTokenMock = vi.fn();
  const acceptInvitationMock = vi.fn();
  return { getInvitationByTokenMock, acceptInvitationMock };
});

vi.mock("@/lib/invitations/invitation-accept-service", () => ({
  getInvitationByToken: h.getInvitationByTokenMock,
  acceptInvitation: h.acceptInvitationMock,
}));

import { GET, POST } from "./route";

const preview = {
  email: "student@school.test",
  role: "STUDENT",
  organizationName: "Demo School",
  expiresAt: "2099-01-01T00:00:00.000Z",
};

function req(method: string, url: string, payload?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  h.getInvitationByTokenMock.mockResolvedValue({
    ok: true,
    invitation: preview,
  });
  h.acceptInvitationMock.mockResolvedValue({
    ok: true,
    user: {
      id: "user-1",
      email: "student@school.test",
      role: "STUDENT",
      firstName: "Alex",
      lastName: "Driver",
    },
    organizationId: "org-a",
    organizationName: "Demo School",
    invitation: {
      id: "inv-1",
      email: "student@school.test",
      role: "STUDENT",
      status: "ACCEPTED",
      expiresAt: preview.expiresAt,
      acceptedAt: "2026-05-22T00:00:00.000Z",
      revokedAt: null,
      createdAt: "2026-05-21T12:00:00.000Z",
      updatedAt: "2026-05-22T00:00:00.000Z",
      createdBy: null,
      acceptedUser: null,
    },
  });
});

describe("GET /api/invitations/accept", () => {
  it("returns 400 when token is missing", async () => {
    const res = await GET(
      req("GET", "http://localhost/api/invitations/accept") as any,
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("missing_invitation_token");
    expect(h.getInvitationByTokenMock).not.toHaveBeenCalled();
  });

  it("returns preview without tokenHash", async () => {
    const res = await GET(
      req("GET", "http://localhost/api/invitations/accept?token=abc") as any,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.invitation).toEqual(preview);
    expect(JSON.stringify(json)).not.toContain("tokenHash");
  });

  it("returns stable error for invalid token", async () => {
    h.getInvitationByTokenMock.mockResolvedValue({
      ok: false,
      error: "Invalid invitation",
      code: "invalid_token",
      status: 404,
    });

    const res = await GET(
      req("GET", "http://localhost/api/invitations/accept?token=bad") as any,
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe("invalid_token");
  });
});

describe("POST /api/invitations/accept", () => {
  it("accepts invitation with token and profile fields only", async () => {
    const res = await POST(
      req("POST", "http://localhost/api/invitations/accept", {
        token: "secret-token",
        firstName: "Alex",
        lastName: "Driver",
        password: "SecurePass1!",
        email: "attacker@evil.test",
        role: "SUPER_ADMIN",
        organizationId: "other-org",
      }) as any,
    );
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.user).not.toHaveProperty("passwordHash");
    expect(json).not.toHaveProperty("tokenHash");

    expect(h.acceptInvitationMock).toHaveBeenCalledWith({
      token: "secret-token",
      firstName: "Alex",
      lastName: "Driver",
      password: "SecurePass1!",
    });
  });

  it("returns validation error when password is missing", async () => {
    const res = await POST(
      req("POST", "http://localhost/api/invitations/accept", {
        token: "secret-token",
        firstName: "Alex",
        lastName: "Driver",
      }) as any,
    );
    expect(res.status).toBe(400);
    expect(h.acceptInvitationMock).not.toHaveBeenCalled();
  });

  it("maps service failures to stable codes", async () => {
    h.acceptInvitationMock.mockResolvedValue({
      ok: false,
      error: "An account with this email already exists",
      code: "user_already_exists",
      status: 409,
    });

    const res = await POST(
      req("POST", "http://localhost/api/invitations/accept", {
        token: "secret-token",
        firstName: "Alex",
        lastName: "Driver",
        password: "SecurePass1!",
      }) as any,
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("user_already_exists");
    expect(json).not.toHaveProperty("passwordHash");
  });
});
