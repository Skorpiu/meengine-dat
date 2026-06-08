import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/instructors/instructor-record-delete", () => ({
  deleteInstructorRecordIfEligible: vi.fn(),
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

import { DELETE } from "./route";
import { deleteInstructorRecordIfEligible } from "@/lib/instructors/instructor-record-delete";
import { getServerSession } from "next-auth";
import {
  assertUserTenantHost,
  rejectDemoUserManagementMutation,
} from "@/lib/users/user-route-access";
import { INSTRUCTOR_DELETE_BLOCK_CODE } from "@/lib/instructors/instructor-record-delete-policy";

const getServerSessionMock = getServerSession as unknown as ReturnType<
  typeof vi.fn
>;
const assertUserTenantHostMock = assertUserTenantHost as unknown as ReturnType<
  typeof vi.fn
>;
const rejectDemoMock =
  rejectDemoUserManagementMutation as unknown as ReturnType<typeof vi.fn>;
const deleteInstructorMock =
  deleteInstructorRecordIfEligible as unknown as ReturnType<typeof vi.fn>;

const routeContext = { params: { id: "inst-1" } };

function req(method: string, url: string): Request {
  return new Request(url, { method });
}

beforeEach(() => {
  vi.resetAllMocks();
  assertUserTenantHostMock.mockResolvedValue(null);
  rejectDemoMock.mockResolvedValue(null);
  deleteInstructorMock.mockResolvedValue({ ok: true });
});

describe("DELETE /api/admin/instructors/[id]", () => {
  it("returns 200 when delete allowed", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await DELETE(
      req(
        "DELETE",
        "http://school.example.com/api/admin/instructors/inst-1",
      ) as any,
      routeContext,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe(true);
    expect(deleteInstructorMock).toHaveBeenCalledWith({
      organizationId: "org-a",
      instructorId: "inst-1",
      currentUserId: "admin-1",
    });
  });

  it("returns 404 when instructor missing or cross-tenant", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    deleteInstructorMock.mockResolvedValue({ ok: false, notFound: true });

    const res = await DELETE(
      req(
        "DELETE",
        "http://school.example.com/api/admin/instructors/inst-9",
      ) as any,
      { params: { id: "inst-9" } },
    );

    expect(res.status).toBe(404);
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

    const res = await DELETE(
      req(
        "DELETE",
        "http://school.example.com/api/admin/instructors/inst-1",
      ) as any,
      routeContext,
    );

    expect(res.status).toBe(403);
    expect(deleteInstructorMock).not.toHaveBeenCalled();
  });

  it("returns 401 when not SUPER_ADMIN", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "INSTRUCTOR", organizationId: "org-a" },
    });

    const res = await DELETE(
      req(
        "DELETE",
        "http://school.example.com/api/admin/instructors/inst-1",
      ) as any,
      routeContext,
    );

    expect(res.status).toBe(401);
    expect(deleteInstructorMock).not.toHaveBeenCalled();
  });

  it("returns 409 with stable code when blocked by lessons", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    deleteInstructorMock.mockResolvedValue({
      ok: false,
      notFound: false,
      code: INSTRUCTOR_DELETE_BLOCK_CODE.HAS_LESSONS,
      codes: [INSTRUCTOR_DELETE_BLOCK_CODE.HAS_LESSONS],
    });

    const res = await DELETE(
      req(
        "DELETE",
        "http://school.example.com/api/admin/instructors/inst-1",
      ) as any,
      routeContext,
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe(INSTRUCTOR_DELETE_BLOCK_CODE.HAS_LESSONS);
  });

  it("returns 409 for each main blocker code", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const blockers = [
      INSTRUCTOR_DELETE_BLOCK_CODE.HAS_PAYMENTS,
      INSTRUCTOR_DELETE_BLOCK_CODE.HAS_EXAMS,
      INSTRUCTOR_DELETE_BLOCK_CODE.HAS_LESSON_REQUESTS,
      INSTRUCTOR_DELETE_BLOCK_CODE.HAS_PREFERRED_STUDENTS,
      INSTRUCTOR_DELETE_BLOCK_CODE.HAS_PENDING_INVITATION,
      INSTRUCTOR_DELETE_BLOCK_CODE.SELF_NOT_ALLOWED,
      INSTRUCTOR_DELETE_BLOCK_CODE.NOT_ALLOWED,
    ] as const;

    for (const code of blockers) {
      deleteInstructorMock.mockResolvedValueOnce({
        ok: false,
        notFound: false,
        code,
        codes: [code],
      });

      const res = await DELETE(
        req(
          "DELETE",
          "http://school.example.com/api/admin/instructors/inst-1",
        ) as any,
        routeContext,
      );

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.code).toBe(code);
    }
  });
});
