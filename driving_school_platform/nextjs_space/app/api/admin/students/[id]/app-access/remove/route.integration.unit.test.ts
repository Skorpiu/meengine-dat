import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  removeStudentAppAccessMock: vi.fn(),
}));

vi.mock("@/lib/students/student-app-access-lifecycle-service", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/students/student-app-access-lifecycle-service")
  >("@/lib/students/student-app-access-lifecycle-service");
  return {
    ...actual,
    removeStudentAppAccess: (...args: unknown[]) =>
      h.removeStudentAppAccessMock(...args),
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
import { STUDENT_APP_ACCESS_REMOVE_CODE } from "@/lib/students/student-app-access-lifecycle-service";

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
  email: "student@school.test",
  phoneNumber: null,
  schoolStudentId: "26001",
  schoolStudentYearSuffix: "26",
  schoolStudentSequence: 1,
  schoolStudentIdSource: "MANUAL",
  enrollmentDate: "2026-05-29T10:00:00.000Z",
  appAccessMode: "MANUAL_ONLY" as const,
  createdAt: "2026-05-29T10:00:00.000Z",
  updatedAt: "2026-06-06T10:00:00.000Z",
  user: null,
  pendingInvitation: null,
};

function req(): Request {
  return new Request(
    "http://school.example.com/api/admin/students/stu-1/app-access/remove",
    { method: "POST" },
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  getServerSessionMock.mockResolvedValue({
    user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
  });
  assertUserTenantHostMock.mockResolvedValue(null);
  rejectDemoMock.mockResolvedValue(null);
  h.removeStudentAppAccessMock.mockResolvedValue({
    ok: true,
    student: studentDto,
  });
});

describe("POST /api/admin/students/[id]/app-access/remove", () => {
  it("returns updated student on success", async () => {
    const res = await POST(req() as any, { params: { id: "stu-1" } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.student).toEqual(studentDto);
    expect(h.removeStudentAppAccessMock).toHaveBeenCalledWith({
      organizationId: "org-a",
      studentId: "stu-1",
    });
  });

  it("returns 401 for non SUPER_ADMIN", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "INSTRUCTOR", organizationId: "org-a" },
    });

    const res = await POST(req() as any, { params: { id: "stu-1" } });
    expect(res.status).toBe(401);
  });

  it("returns 404 for missing student", async () => {
    h.removeStudentAppAccessMock.mockResolvedValue({
      ok: false,
      notFound: true,
    });

    const res = await POST(req() as any, { params: { id: "missing" } });
    expect(res.status).toBe(404);
  });

  it("returns 409 with code for wrong state", async () => {
    h.removeStudentAppAccessMock.mockResolvedValue({
      ok: false,
      notFound: false,
      code: STUDENT_APP_ACCESS_REMOVE_CODE.STUDENT_NOT_APP_USER,
      error: "Only students with active app access can be removed.",
    });

    const res = await POST(req() as any, { params: { id: "stu-1" } });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe(STUDENT_APP_ACCESS_REMOVE_CODE.STUDENT_NOT_APP_USER);
  });

  it("returns 403 for demo guard", async () => {
    rejectDemoMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "demo_mutation_disabled" }), {
        status: 403,
      }),
    );

    const res = await POST(req() as any, { params: { id: "stu-1" } });
    expect(res.status).toBe(403);
    expect(h.removeStudentAppAccessMock).not.toHaveBeenCalled();
  });
});
