import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  changeInstructorEmailMock: vi.fn(),
}));

vi.mock("@/lib/instructors/instructor-email-change-service", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/instructors/instructor-email-change-service")
  >("@/lib/instructors/instructor-email-change-service");
  return {
    ...actual,
    changeInstructorEmail: (...args: unknown[]) =>
      h.changeInstructorEmailMock(...args),
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
import { INSTRUCTOR_EMAIL_CHANGE_CODE } from "@/lib/instructors/instructor-email-change-service";

const getServerSessionMock = getServerSession as unknown as ReturnType<
  typeof vi.fn
>;
const assertUserTenantHostMock = assertUserTenantHost as unknown as ReturnType<
  typeof vi.fn
>;
const rejectDemoMock =
  rejectDemoUserManagementMutation as unknown as ReturnType<typeof vi.fn>;

const instructorUserDto = {
  id: "user-1",
  email: "new@school.test",
  firstName: "Ana",
  lastName: "Costa",
  phoneNumber: null,
  address: null,
  role: "INSTRUCTOR",
  isApproved: true,
  instructor: {
    id: "inst-1",
    instructorIdNumber: "INS-001",
    instructorLicenseNumber: "LIC-1",
    instructorLicenseExpiry: "2027-01-01T00:00:00.000Z",
    isAvailableForBooking: true,
  },
};

function req(body?: unknown): Request {
  return new Request(
    "http://school.example.com/api/admin/instructors/inst-1/change-email",
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
  h.changeInstructorEmailMock.mockResolvedValue({
    ok: true,
    user: instructorUserDto,
  });
});

describe("POST /api/admin/instructors/[id]/change-email", () => {
  it("returns updated user on success", async () => {
    const res = await POST(req({ newEmail: "new@school.test" }) as any, {
      params: { id: "inst-1" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe("new@school.test");
    expect(h.changeInstructorEmailMock).toHaveBeenCalledWith({
      organizationId: "org-a",
      instructorId: "inst-1",
      newEmail: "new@school.test",
    });
  });

  it("returns 401 for non SUPER_ADMIN", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "INSTRUCTOR", organizationId: "org-a" },
    });

    const res = await POST(req({ newEmail: "new@school.test" }) as any, {
      params: { id: "inst-1" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 for missing instructor", async () => {
    h.changeInstructorEmailMock.mockResolvedValue({
      ok: false,
      notFound: true,
    });

    const res = await POST(req({ newEmail: "new@school.test" }) as any, {
      params: { id: "inst-9" },
    });
    expect(res.status).toBe(404);
  });

  it("returns stable 409 for user_email_already_exists", async () => {
    h.changeInstructorEmailMock.mockResolvedValue({
      ok: false,
      notFound: false,
      code: INSTRUCTOR_EMAIL_CHANGE_CODE.USER_EMAIL_ALREADY_EXISTS,
      error: "An account with this email already exists.",
      status: 409,
    });

    const res = await POST(req({ newEmail: "taken@school.test" }) as any, {
      params: { id: "inst-1" },
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("user_email_already_exists");
  });

  it("returns 400 for invalid email body", async () => {
    const res = await POST(req({ newEmail: "not-an-email" }) as any, {
      params: { id: "inst-1" },
    });
    expect(res.status).toBe(400);
    expect(h.changeInstructorEmailMock).not.toHaveBeenCalled();
  });

  it("blocks demo org mutations", async () => {
    rejectDemoMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "demo_restricted_action" }), {
        status: 403,
      }),
    );

    const res = await POST(req({ newEmail: "new@school.test" }) as any, {
      params: { id: "inst-1" },
    });
    expect(res.status).toBe(403);
    expect(h.changeInstructorEmailMock).not.toHaveBeenCalled();
  });
});
