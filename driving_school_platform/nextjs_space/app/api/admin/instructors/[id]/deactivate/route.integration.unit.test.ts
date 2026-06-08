import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/instructors/instructor-record-deactivate", () => ({
  deactivateInstructorRecord: vi.fn(),
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
import { deactivateInstructorRecord } from "@/lib/instructors/instructor-record-deactivate";
import { getServerSession } from "next-auth";
import {
  assertUserTenantHost,
  rejectDemoUserManagementMutation,
} from "@/lib/users/user-route-access";
import { INSTRUCTOR_DEACTIVATE_BLOCK_CODE } from "@/lib/instructors/instructor-record-deactivate-policy";

const getServerSessionMock = getServerSession as unknown as ReturnType<
  typeof vi.fn
>;
const assertUserTenantHostMock = assertUserTenantHost as unknown as ReturnType<
  typeof vi.fn
>;
const rejectDemoMock =
  rejectDemoUserManagementMutation as unknown as ReturnType<typeof vi.fn>;
const deactivateMock = deactivateInstructorRecord as unknown as ReturnType<
  typeof vi.fn
>;

const routeContext = { params: { id: "inst-1" } };

function req(url: string): Request {
  return new Request(url, { method: "POST" });
}

beforeEach(() => {
  vi.resetAllMocks();
  assertUserTenantHostMock.mockResolvedValue(null);
  rejectDemoMock.mockResolvedValue(null);
  deactivateMock.mockResolvedValue({
    ok: true,
    alreadyInactive: false,
    warningCodes: [],
    futureLessonsCount: 0,
  });
});

describe("POST /api/admin/instructors/[id]/deactivate", () => {
  it("returns 200 when deactivate succeeds", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await POST(
      req(
        "http://school.example.com/api/admin/instructors/inst-1/deactivate",
      ) as any,
      routeContext,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.deactivated).toBe(true);
  });

  it("returns alreadyInactive payload", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    deactivateMock.mockResolvedValue({
      ok: true,
      alreadyInactive: true,
      warningCodes: [],
      futureLessonsCount: 0,
    });

    const res = await POST(
      req(
        "http://school.example.com/api/admin/instructors/inst-1/deactivate",
      ) as any,
      routeContext,
    );

    const body = await res.json();
    expect(body.data.alreadyInactive).toBe(true);
  });

  it("returns warning payload for future lessons", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    deactivateMock.mockResolvedValue({
      ok: true,
      alreadyInactive: false,
      warningCodes: ["instructor_has_future_lessons"],
      futureLessonsCount: 2,
    });

    const res = await POST(
      req(
        "http://school.example.com/api/admin/instructors/inst-1/deactivate",
      ) as any,
      routeContext,
    );

    const body = await res.json();
    expect(body.data.warningCodes).toContain("instructor_has_future_lessons");
    expect(body.data.futureLessonsCount).toBe(2);
  });

  it("returns 404 when not found", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    deactivateMock.mockResolvedValue({ ok: false, notFound: true });

    const res = await POST(
      req(
        "http://school.example.com/api/admin/instructors/inst-9/deactivate",
      ) as any,
      { params: { id: "inst-9" } },
    );

    expect(res.status).toBe(404);
  });

  it("returns 409 for self-deactivate", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    deactivateMock.mockResolvedValue({
      ok: false,
      notFound: false,
      code: INSTRUCTOR_DEACTIVATE_BLOCK_CODE.SELF_NOT_ALLOWED,
    });

    const res = await POST(
      req(
        "http://school.example.com/api/admin/instructors/inst-1/deactivate",
      ) as any,
      routeContext,
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe(INSTRUCTOR_DEACTIVATE_BLOCK_CODE.SELF_NOT_ALLOWED);
  });

  it("returns 403 for demo org", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-demo" },
    });
    rejectDemoMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "demo_restricted_action" }), {
        status: 403,
      }),
    );

    const res = await POST(
      req(
        "http://school.example.com/api/admin/instructors/inst-1/deactivate",
      ) as any,
      routeContext,
    );

    expect(res.status).toBe(403);
    expect(deactivateMock).not.toHaveBeenCalled();
  });
});
