import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/instructors/instructor-record-delete", () => ({
  deleteInstructorRecordIfEligible: vi.fn(),
}));

vi.mock("@/lib/instructors/instructor-record-qualified-categories", () => ({
  updateInstructorQualifiedCategories: vi.fn(),
}));

vi.mock("@/lib/audit/people-audit", () => ({
  writeInstructorDeleteAuditEvent: vi.fn(),
  writeInstructorQualifiedCategoriesAuditEvent: vi.fn(),
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

import { DELETE, PATCH } from "./route";
import { deleteInstructorRecordIfEligible } from "@/lib/instructors/instructor-record-delete";
import { updateInstructorQualifiedCategories } from "@/lib/instructors/instructor-record-qualified-categories";
import {
  writeInstructorDeleteAuditEvent,
  writeInstructorQualifiedCategoriesAuditEvent,
} from "@/lib/audit/people-audit";
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
const updateQualifiedCategoriesMock =
  updateInstructorQualifiedCategories as unknown as ReturnType<typeof vi.fn>;
const writeDeleteAuditMock =
  writeInstructorDeleteAuditEvent as unknown as ReturnType<typeof vi.fn>;
const writeQualifiedCategoriesAuditMock =
  writeInstructorQualifiedCategoriesAuditEvent as unknown as ReturnType<
    typeof vi.fn
  >;

const routeContext = { params: { id: "inst-1" } };

function req(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  assertUserTenantHostMock.mockResolvedValue(null);
  rejectDemoMock.mockResolvedValue(null);
  deleteInstructorMock.mockResolvedValue({
    ok: true,
    audit: {
      hadLinkedUser: true,
      lessonsCount: 0,
      linkedUserId: "user-1",
      isAvailableForBooking: true,
    },
  });
  writeDeleteAuditMock.mockResolvedValue({
    ok: true,
    id: "audit-delete-1",
  });
  updateQualifiedCategoriesMock.mockResolvedValue({
    ok: true,
    instructor: {
      id: "inst-1",
      qualifiedCategories: [{ id: 2, name: "B" }],
    },
  });
  writeQualifiedCategoriesAuditMock.mockResolvedValue({
    ok: true,
    id: "audit-1",
  });
});

describe("DELETE /api/admin/instructors/[id]", () => {
  it("returns 200 when delete allowed and emits audit", async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: "admin-1",
        role: "SUPER_ADMIN",
        organizationId: "org-a",
        email: "admin@school.test",
      },
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
    expect(writeDeleteAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        actor: {
          userId: "admin-1",
          role: "SUPER_ADMIN",
          email: "admin@school.test",
        },
        instructorId: "inst-1",
        hadLinkedUser: true,
        lessonsCount: 0,
        linkedUserId: "user-1",
        isAvailableForBooking: true,
        requestContext: expect.objectContaining({
          requestMethod: "DELETE",
          requestPath: "/api/admin/instructors/inst-1",
        }),
      }),
    );

    const auditPayload = JSON.stringify(
      writeDeleteAuditMock.mock.calls[0]?.[0],
    );
    expect(auditPayload).not.toContain("password");
    expect(auditPayload).not.toContain("tokenHash");
    expect(auditPayload).not.toContain("instructor@");
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
    expect(writeDeleteAuditMock).not.toHaveBeenCalled();
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
    expect(writeDeleteAuditMock).not.toHaveBeenCalled();
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
    expect(writeDeleteAuditMock).not.toHaveBeenCalled();
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
    expect(writeDeleteAuditMock).not.toHaveBeenCalled();
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
      expect(writeDeleteAuditMock).not.toHaveBeenCalled();
    }
  });

  it("DELETE still returns 200 when audit write fails", async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: "admin-1",
        role: "SUPER_ADMIN",
        organizationId: "org-a",
        email: "admin@school.test",
      },
    });
    writeDeleteAuditMock.mockResolvedValue({
      ok: false,
      error: "db_down",
    });

    const res = await DELETE(
      req(
        "DELETE",
        "http://school.example.com/api/admin/instructors/inst-1",
      ) as any,
      routeContext,
    );

    expect(res.status).toBe(200);
    expect(writeDeleteAuditMock).toHaveBeenCalled();
    expect(deleteInstructorMock).toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/instructors/[id]", () => {
  it("returns 200 when qualified categories update succeeds", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await PATCH(
      req("PATCH", "http://school.example.com/api/admin/instructors/inst-1", {
        qualifiedCategoryNames: ["B"],
      }) as any,
      routeContext,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.instructor.qualifiedCategories).toEqual([
      { id: 2, name: "B" },
    ]);
    expect(updateQualifiedCategoriesMock).toHaveBeenCalledWith({
      organizationId: "org-a",
      instructorId: "inst-1",
      qualifiedCategoryNames: ["B"],
    });
    expect(writeQualifiedCategoriesAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        actor: expect.objectContaining({
          userId: "admin-1",
          role: "SUPER_ADMIN",
        }),
        instructor: {
          id: "inst-1",
          qualifiedCategories: [{ id: 2, name: "B" }],
        },
        requestContext: expect.objectContaining({
          requestMethod: "PATCH",
          requestPath: "/api/admin/instructors/inst-1",
        }),
      }),
    );

    const auditPayload = JSON.stringify(
      writeQualifiedCategoriesAuditMock.mock.calls[0]?.[0],
    );
    expect(auditPayload).not.toContain("password");
    expect(auditPayload).not.toContain("tokenHash");
  });

  it("returns 400 for invalid request body", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await PATCH(
      req("PATCH", "http://school.example.com/api/admin/instructors/inst-1", {
        qualifiedCategoryNames: "B",
      }) as any,
      routeContext,
    );

    expect(res.status).toBe(400);
    expect(updateQualifiedCategoriesMock).not.toHaveBeenCalled();
  });

  it("returns 404 when instructor is missing or cross-tenant", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    updateQualifiedCategoriesMock.mockResolvedValue({
      ok: false,
      notFound: true,
    });

    const res = await PATCH(
      req("PATCH", "http://school.example.com/api/admin/instructors/inst-9", {
        qualifiedCategoryNames: [],
      }) as any,
      { params: { id: "inst-9" } },
    );

    expect(res.status).toBe(404);
    expect(writeQualifiedCategoriesAuditMock).not.toHaveBeenCalled();
  });

  it("returns 400 when category is unknown or inactive", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    updateQualifiedCategoriesMock.mockResolvedValue({
      ok: false,
      error: "category_not_found",
      categoryName: "ZZZ",
    });

    const res = await PATCH(
      req("PATCH", "http://school.example.com/api/admin/instructors/inst-1", {
        qualifiedCategoryNames: ["ZZZ"],
      }) as any,
      routeContext,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("category_not_found");
    expect(body.categoryName).toBe("ZZZ");
    expect(writeQualifiedCategoriesAuditMock).not.toHaveBeenCalled();
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

    const res = await PATCH(
      req("PATCH", "http://school.example.com/api/admin/instructors/inst-1", {
        qualifiedCategoryNames: ["B"],
      }) as any,
      routeContext,
    );

    expect(res.status).toBe(403);
    expect(updateQualifiedCategoriesMock).not.toHaveBeenCalled();
    expect(writeQualifiedCategoriesAuditMock).not.toHaveBeenCalled();
  });

  it("returns 200 when audit write fails", async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: "admin-1",
        role: "SUPER_ADMIN",
        organizationId: "org-a",
        email: "admin@school.test",
      },
    });
    writeQualifiedCategoriesAuditMock.mockResolvedValue({
      ok: false,
      error: "db_down",
    });

    const res = await PATCH(
      req("PATCH", "http://school.example.com/api/admin/instructors/inst-1", {
        qualifiedCategoryNames: ["B"],
      }) as any,
      routeContext,
    );

    expect(res.status).toBe(200);
    expect(writeQualifiedCategoriesAuditMock).toHaveBeenCalled();
  });
});
