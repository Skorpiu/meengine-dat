import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  writeInstructorReactivateAuditEventMock: vi.fn(),
  instructorFindFirstMock: vi.fn(),
}));

vi.mock("@/lib/instructors/instructor-record-reactivate", () => ({
  reactivateInstructorRecord: vi.fn(),
}));

vi.mock("@/lib/audit/people-audit", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/audit/people-audit")
  >("@/lib/audit/people-audit");
  return {
    ...actual,
    writeInstructorReactivateAuditEvent: (...args: unknown[]) =>
      h.writeInstructorReactivateAuditEventMock(...args),
  };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    instructor: {
      findFirst: (...args: unknown[]) => h.instructorFindFirstMock(...args),
    },
  },
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
import { reactivateInstructorRecord } from "@/lib/instructors/instructor-record-reactivate";
import { getServerSession } from "next-auth";
import {
  assertUserTenantHost,
  rejectDemoUserManagementMutation,
} from "@/lib/users/user-route-access";
import { INSTRUCTOR_REACTIVATE_BLOCK_CODE } from "@/lib/instructors/instructor-record-reactivate-policy";

const getServerSessionMock = getServerSession as unknown as ReturnType<
  typeof vi.fn
>;
const assertUserTenantHostMock = assertUserTenantHost as unknown as ReturnType<
  typeof vi.fn
>;
const rejectDemoMock =
  rejectDemoUserManagementMutation as unknown as ReturnType<typeof vi.fn>;
const reactivateMock = reactivateInstructorRecord as unknown as ReturnType<
  typeof vi.fn
>;

const routeContext = { params: Promise.resolve({ id: "inst-1" }) };

function req(url: string): Request {
  return new Request(url, { method: "POST" });
}

beforeEach(() => {
  vi.resetAllMocks();
  assertUserTenantHostMock.mockResolvedValue(null);
  rejectDemoMock.mockResolvedValue(null);
  reactivateMock.mockResolvedValue({
    ok: true,
    alreadyActive: false,
  });
  h.instructorFindFirstMock.mockResolvedValue({ userId: "user-1" });
  h.writeInstructorReactivateAuditEventMock.mockResolvedValue({
    ok: true,
    id: "audit-1",
  });
});

describe("POST /api/admin/instructors/[id]/reactivate", () => {
  it("returns 200 when reactivate succeeds", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await POST(
      req(
        "http://school.example.com/api/admin/instructors/inst-1/reactivate",
      ) as any,
      routeContext,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.reactivated).toBe(true);
    expect(h.writeInstructorReactivateAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        instructorId: "inst-1",
        targetUserId: "user-1",
        alreadyActive: false,
      }),
    );
  });

  it("returns alreadyActive payload", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    reactivateMock.mockResolvedValue({
      ok: true,
      alreadyActive: true,
    });

    const res = await POST(
      req(
        "http://school.example.com/api/admin/instructors/inst-1/reactivate",
      ) as any,
      routeContext,
    );

    const body = await res.json();
    expect(body.data.alreadyActive).toBe(true);
  });

  it("returns 404 when not found", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    reactivateMock.mockResolvedValue({ ok: false, notFound: true });

    const res = await POST(
      req(
        "http://school.example.com/api/admin/instructors/inst-9/reactivate",
      ) as any,
      { params: Promise.resolve({ id: "inst-9" }) },
    );

    expect(res.status).toBe(404);
    expect(h.writeInstructorReactivateAuditEventMock).not.toHaveBeenCalled();
  });

  it("returns 409 when not allowed", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    reactivateMock.mockResolvedValue({
      ok: false,
      notFound: false,
      code: INSTRUCTOR_REACTIVATE_BLOCK_CODE.NOT_ALLOWED,
    });

    const res = await POST(
      req(
        "http://school.example.com/api/admin/instructors/inst-1/reactivate",
      ) as any,
      routeContext,
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe(INSTRUCTOR_REACTIVATE_BLOCK_CODE.NOT_ALLOWED);
    expect(h.writeInstructorReactivateAuditEventMock).not.toHaveBeenCalled();
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
        "http://school.example.com/api/admin/instructors/inst-1/reactivate",
      ) as any,
      routeContext,
    );

    expect(res.status).toBe(403);
    expect(reactivateMock).not.toHaveBeenCalled();
    expect(h.writeInstructorReactivateAuditEventMock).not.toHaveBeenCalled();
  });

  it("POST still returns 200 when audit write fails", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.writeInstructorReactivateAuditEventMock.mockResolvedValue({
      ok: false,
      error: "db_down",
    });

    const res = await POST(
      req(
        "http://school.example.com/api/admin/instructors/inst-1/reactivate",
      ) as any,
      routeContext,
    );

    expect(res.status).toBe(200);
    expect(h.writeInstructorReactivateAuditEventMock).toHaveBeenCalled();
    expect(reactivateMock).toHaveBeenCalled();
  });
});
