import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  reactivateStudentAppAccessMock: vi.fn(),
  writeStudentAppAccessReactivateAuditEventMock: vi.fn(),
}));

vi.mock("@/lib/students/student-app-access-lifecycle-service", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/students/student-app-access-lifecycle-service")
  >("@/lib/students/student-app-access-lifecycle-service");
  return {
    ...actual,
    reactivateStudentAppAccess: (...args: unknown[]) =>
      h.reactivateStudentAppAccessMock(...args),
  };
});

vi.mock("@/lib/audit/student-audit", () => ({
  writeStudentAppAccessReactivateAuditEvent:
    h.writeStudentAppAccessReactivateAuditEventMock,
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
import { STUDENT_APP_ACCESS_REACTIVATE_CODE } from "@/lib/students/student-app-access-lifecycle-service";

const getServerSessionMock = getServerSession as unknown as ReturnType<
  typeof vi.fn
>;
const assertUserTenantHostMock = assertUserTenantHost as unknown as ReturnType<
  typeof vi.fn
>;
const rejectDemoMock =
  rejectDemoUserManagementMutation as unknown as ReturnType<typeof vi.fn>;

const studentDto = {
  id: "stu-1",
  userId: "user-1",
  firstName: "João",
  lastName: "Silva",
  email: "student@school.test",
  phoneNumber: null,
  schoolStudentId: "26001",
  schoolStudentYearSuffix: "26",
  schoolStudentSequence: 1,
  schoolStudentIdSource: "MANUAL",
  enrollmentDate: "2026-05-29T10:00:00.000Z",
  appAccessMode: "APP_USER" as const,
  createdAt: "2026-05-29T10:00:00.000Z",
  updatedAt: "2026-06-06T10:00:00.000Z",
  user: {
    id: "user-1",
    email: "student@school.test",
    firstName: "João",
    lastName: "Silva",
  },
  pendingInvitation: null,
};

function req(): Request {
  return new Request(
    "http://school.example.com/api/admin/students/stu-1/app-access/reactivate",
    { method: "POST" },
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  getServerSessionMock.mockResolvedValue({
    user: {
      id: "admin-1",
      role: "SUPER_ADMIN",
      organizationId: "org-a",
      email: "admin@school.test",
    },
  });
  assertUserTenantHostMock.mockResolvedValue(null);
  rejectDemoMock.mockResolvedValue(null);
  h.reactivateStudentAppAccessMock.mockResolvedValue({
    ok: true,
    student: studentDto,
  });
  h.writeStudentAppAccessReactivateAuditEventMock.mockResolvedValue({
    ok: true,
    id: "audit-1",
  });
});

describe("POST /api/admin/students/[id]/app-access/reactivate", () => {
  it("returns updated student on success", async () => {
    const res = await POST(req() as any, { params: { id: "stu-1" } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.student).toEqual(studentDto);
    expect(
      h.writeStudentAppAccessReactivateAuditEventMock,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        actor: {
          userId: "admin-1",
          role: "SUPER_ADMIN",
          email: "admin@school.test",
        },
        studentId: "stu-1",
        appAccessMode: "APP_USER",
        linkedUserId: "user-1",
      }),
    );

    const auditPayload = JSON.stringify(
      h.writeStudentAppAccessReactivateAuditEventMock.mock.calls[0]?.[0],
    );
    expect(auditPayload).not.toContain("password");
    expect(auditPayload).not.toContain("tokenHash");
  });

  it("returns 401 for non SUPER_ADMIN", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "INSTRUCTOR", organizationId: "org-a" },
    });

    const res = await POST(req() as any, { params: { id: "stu-1" } });
    expect(res.status).toBe(401);
  });

  it("returns 404 for missing student", async () => {
    h.reactivateStudentAppAccessMock.mockResolvedValue({
      ok: false,
      notFound: true,
    });

    const res = await POST(req() as any, { params: { id: "missing" } });
    expect(res.status).toBe(404);
  });

  it("returns 409 with code for orphan user not found", async () => {
    h.reactivateStudentAppAccessMock.mockResolvedValue({
      ok: false,
      notFound: false,
      code: STUDENT_APP_ACCESS_REACTIVATE_CODE.REACTIVATE_ORPHAN_USER_NOT_FOUND,
      error: "No existing app account was found for this email.",
      status: 409,
    });

    const res = await POST(req() as any, { params: { id: "stu-1" } });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe(
      STUDENT_APP_ACCESS_REACTIVATE_CODE.REACTIVATE_ORPHAN_USER_NOT_FOUND,
    );
  });

  it("returns 400 for missing email", async () => {
    h.reactivateStudentAppAccessMock.mockResolvedValue({
      ok: false,
      notFound: false,
      code: STUDENT_APP_ACCESS_REACTIVATE_CODE.MISSING_EMAIL,
      error: "An email address is required to reactivate app access.",
      status: 400,
    });

    const res = await POST(req() as any, { params: { id: "stu-1" } });
    expect(res.status).toBe(400);
  });

  it("returns 403 for demo guard", async () => {
    rejectDemoMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "demo_mutation_disabled" }), {
        status: 403,
      }),
    );

    const res = await POST(req() as any, { params: { id: "stu-1" } });
    expect(res.status).toBe(403);
    expect(h.reactivateStudentAppAccessMock).not.toHaveBeenCalled();
  });

  it("POST does not emit audit when reactivate fails", async () => {
    h.reactivateStudentAppAccessMock.mockResolvedValue({
      ok: false,
      notFound: true,
    });

    const res = await POST(req() as any, { params: { id: "missing" } });
    expect(res.status).toBe(404);
    expect(
      h.writeStudentAppAccessReactivateAuditEventMock,
    ).not.toHaveBeenCalled();
  });

  it("POST still returns 200 when audit write fails", async () => {
    h.writeStudentAppAccessReactivateAuditEventMock.mockResolvedValue({
      ok: false,
      error: "db_down",
    });

    const res = await POST(req() as any, { params: { id: "stu-1" } });

    expect(res.status).toBe(200);
    expect(h.writeStudentAppAccessReactivateAuditEventMock).toHaveBeenCalled();
    expect(h.reactivateStudentAppAccessMock).toHaveBeenCalled();
  });
});
