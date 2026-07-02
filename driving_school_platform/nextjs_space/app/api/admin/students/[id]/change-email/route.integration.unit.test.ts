import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  changeStudentEmailMock: vi.fn(),
  writeStudentEmailChangeAuditEventMock: vi.fn(),
}));

vi.mock("@/lib/students/student-email-change-service", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/students/student-email-change-service")
  >("@/lib/students/student-email-change-service");
  return {
    ...actual,
    changeStudentEmail: (...args: unknown[]) =>
      h.changeStudentEmailMock(...args),
  };
});

vi.mock("@/lib/audit/student-audit", () => ({
  writeStudentEmailChangeAuditEvent: h.writeStudentEmailChangeAuditEventMock,
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
import { STUDENT_EMAIL_CHANGE_CODE } from "@/lib/students/student-email-change-service";

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
  userId: null,
  firstName: "João",
  lastName: "Silva",
  email: "new@school.test",
  phoneNumber: null,
  address: null,
  schoolStudentId: "26001",
  schoolStudentYearSuffix: "26",
  schoolStudentSequence: 1,
  schoolStudentIdSource: "MANUAL",
  enrollmentDate: "2026-05-29T10:00:00.000Z",
  appAccessMode: "MANUAL_ONLY" as const,
  createdAt: "2026-05-29T10:00:00.000Z",
  updatedAt: "2026-06-08T10:00:00.000Z",
  user: null,
  pendingInvitation: null,
};

function req(body?: unknown): Request {
  return new Request(
    "http://school.example.com/api/admin/students/stu-1/change-email",
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
    user: {
      id: "admin-1",
      role: "SUPER_ADMIN",
      organizationId: "org-a",
      email: "admin@school.test",
    },
  });
  assertUserTenantHostMock.mockResolvedValue(null);
  rejectDemoMock.mockResolvedValue(null);
  h.changeStudentEmailMock.mockResolvedValue({
    ok: true,
    student: studentDto,
    audit: {
      policyMode: "MANUAL_ONLY",
      hasLinkedUser: false,
      invitationRevoked: false,
    },
  });
  h.writeStudentEmailChangeAuditEventMock.mockResolvedValue({
    ok: true,
    id: "audit-1",
  });
});

describe("POST /api/admin/students/[id]/change-email", () => {
  it("returns updated student on success", async () => {
    const res = await POST(req({ newEmail: "new@school.test" }) as any, {
      params: { id: "stu-1" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.student.email).toBe("new@school.test");
    expect(h.changeStudentEmailMock).toHaveBeenCalledWith({
      organizationId: "org-a",
      studentId: "stu-1",
      newEmail: "new@school.test",
    });
    expect(h.writeStudentEmailChangeAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        actor: {
          userId: "admin-1",
          role: "SUPER_ADMIN",
          email: "admin@school.test",
        },
        studentId: "stu-1",
        policyMode: "MANUAL_ONLY",
        hasLinkedUser: false,
        invitationRevoked: false,
      }),
    );

    const auditPayload = JSON.stringify(
      h.writeStudentEmailChangeAuditEventMock.mock.calls[0]?.[0],
    );
    expect(auditPayload).not.toContain("new@school.test");
    expect(auditPayload).not.toContain("password");
  });

  it("returns 401 for non SUPER_ADMIN", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "INSTRUCTOR", organizationId: "org-a" },
    });

    const res = await POST(req({ newEmail: "new@school.test" }) as any, {
      params: { id: "stu-1" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 for missing student", async () => {
    h.changeStudentEmailMock.mockResolvedValue({ ok: false, notFound: true });

    const res = await POST(req({ newEmail: "new@school.test" }) as any, {
      params: { id: "stu-9" },
    });
    expect(res.status).toBe(404);
  });

  it("returns stable 409 for user_email_already_exists", async () => {
    h.changeStudentEmailMock.mockResolvedValue({
      ok: false,
      notFound: false,
      code: STUDENT_EMAIL_CHANGE_CODE.USER_EMAIL_ALREADY_EXISTS,
      error: "An account with this email already exists.",
      status: 409,
    });

    const res = await POST(req({ newEmail: "taken@school.test" }) as any, {
      params: { id: "stu-1" },
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("user_email_already_exists");
  });

  it("returns 400 for invalid email body", async () => {
    const res = await POST(req({ newEmail: "not-an-email" }) as any, {
      params: { id: "stu-1" },
    });
    expect(res.status).toBe(400);
    expect(h.changeStudentEmailMock).not.toHaveBeenCalled();
  });

  it("POST does not emit audit when change-email fails", async () => {
    h.changeStudentEmailMock.mockResolvedValue({ ok: false, notFound: true });

    const res = await POST(req({ newEmail: "new@school.test" }) as any, {
      params: { id: "stu-9" },
    });
    expect(res.status).toBe(404);
    expect(h.writeStudentEmailChangeAuditEventMock).not.toHaveBeenCalled();
  });

  it("POST still returns 200 when audit write fails", async () => {
    h.writeStudentEmailChangeAuditEventMock.mockResolvedValue({
      ok: false,
      error: "db_down",
    });

    const res = await POST(req({ newEmail: "new@school.test" }) as any, {
      params: { id: "stu-1" },
    });

    expect(res.status).toBe(200);
    expect(h.writeStudentEmailChangeAuditEventMock).toHaveBeenCalled();
    expect(h.changeStudentEmailMock).toHaveBeenCalled();
  });
});
