import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findFirstMock = vi.fn();
  const updateMock = vi.fn();
  const categoryFindFirstMock = vi.fn();
  const transmissionFindFirstMock = vi.fn();

  const prismaMock = {
    student: {
      findFirst: findFirstMock,
      update: updateMock,
    },
    category: {
      findFirst: categoryFindFirstMock,
    },
    transmissionType: {
      findFirst: transmissionFindFirstMock,
    },
  };

  return {
    prismaMock,
    findFirstMock,
    updateMock,
    categoryFindFirstMock,
    transmissionFindFirstMock,
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
  db: h.prismaMock,
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

vi.mock("@/lib/students/student-record-delete", () => ({
  deleteStudentRecordIfEligible: vi.fn(),
}));

import { GET, PATCH, DELETE } from "./route";
import { deleteStudentRecordIfEligible } from "@/lib/students/student-record-delete";
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
const rejectDemoMock =
  rejectDemoUserManagementMutation as unknown as ReturnType<typeof vi.fn>;
const deleteStudentMock =
  deleteStudentRecordIfEligible as unknown as ReturnType<typeof vi.fn>;

const studentRow = {
  id: "stu-1",
  userId: null,
  firstName: "João",
  lastName: "Silva",
  email: null,
  phoneNumber: null,
  address: null,
  schoolStudentId: "26001",
  schoolStudentYearSuffix: "26",
  schoolStudentSequence: 1,
  schoolStudentIdSource: "MANUAL",
  enrollmentDate: new Date("2026-05-29T10:00:00.000Z"),
  appAccessMode: "MANUAL_ONLY",
  category: null,
  transmissionType: null,
  createdAt: new Date("2026-05-29T10:00:00.000Z"),
  updatedAt: new Date("2026-05-29T10:00:00.000Z"),
  user: null,
  userInvitations: [],
};

function req(method: string, url: string, payload?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
}

const routeContext = { params: { id: "stu-1" } };

beforeEach(() => {
  vi.resetAllMocks();
  h.findFirstMock.mockResolvedValue(studentRow);
  h.updateMock.mockResolvedValue({
    ...studentRow,
    firstName: "Maria",
    schoolStudentId: "26012",
    schoolStudentYearSuffix: "26",
    schoolStudentSequence: 12,
  });
  assertUserTenantHostMock.mockResolvedValue(null);
  rejectDemoMock.mockResolvedValue(null);
  deleteStudentMock.mockResolvedValue({ ok: true });
});

describe("GET /api/admin/students/[id]", () => {
  it("returns student scoped to organization", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.findFirstMock.mockResolvedValueOnce(studentRow);

    const res = await GET(
      req("GET", "http://school.example.com/api/admin/students/stu-1") as any,
      routeContext,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.student.id).toBe("stu-1");

    const arg = h.findFirstMock.mock.calls[0]?.[0];
    expect(arg.where.organizationId).toBe("org-a");
    expect(arg.where.id).toBe("stu-1");
  });

  it("returns 404 when student is outside organization", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.findFirstMock.mockResolvedValue(null);

    const res = await GET(
      req("GET", "http://school.example.com/api/admin/students/stu-9") as any,
      { params: { id: "stu-9" } },
    );

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/admin/students/[id]", () => {
  it("updates operational fields", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.findFirstMock.mockResolvedValue({ id: "stu-1" });

    const res = await PATCH(
      req("PATCH", "http://school.example.com/api/admin/students/stu-1", {
        firstName: "Maria",
        phoneNumber: "+351911111111",
      }) as any,
      routeContext,
    );

    expect(res.status).toBe(200);
    const updateArg = h.updateMock.mock.calls[0]?.[0];
    expect(updateArg.data.firstName).toBe("Maria");
    expect(updateArg.data.userId).toBeUndefined();
    expect(updateArg.data.appAccessMode).toBeUndefined();
  });

  it("regenerates schoolStudentId when yearSuffix and sequenceNumber change", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.findFirstMock.mockImplementation(
      (args: { where?: Record<string, unknown> }) => {
        if (args?.where && "schoolStudentId" in args.where) {
          return Promise.resolve(null);
        }
        return Promise.resolve({ id: "stu-1" });
      },
    );

    const res = await PATCH(
      req("PATCH", "http://school.example.com/api/admin/students/stu-1", {
        yearSuffix: "26",
        sequenceNumber: 12,
      }) as any,
      routeContext,
    );

    expect(res.status).toBe(200);
    const updateArg = h.updateMock.mock.calls[0]?.[0];
    expect(updateArg.data.schoolStudentId).toBe("26012");
    expect(updateArg.data.schoolStudentSequence).toBe(12);
  });

  it("returns 409 on duplicate schoolStudentId", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.findFirstMock
      .mockResolvedValueOnce({ id: "stu-1" })
      .mockResolvedValueOnce({ id: "other" });

    const res = await PATCH(
      req("PATCH", "http://school.example.com/api/admin/students/stu-1", {
        yearSuffix: "26",
        sequenceNumber: 12,
      }) as any,
      routeContext,
    );

    expect(res.status).toBe(409);
    expect(h.updateMock).not.toHaveBeenCalled();
  });

  it("returns 404 when student not in organization", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.findFirstMock.mockResolvedValue(null);

    const res = await PATCH(
      req("PATCH", "http://school.example.com/api/admin/students/stu-9", {
        firstName: "Maria",
      }) as any,
      { params: { id: "stu-9" } },
    );

    expect(res.status).toBe(404);
    expect(h.updateMock).not.toHaveBeenCalled();
  });

  it("updates license category and transmission on student profile", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.findFirstMock.mockResolvedValue({ id: "stu-1" });
    h.categoryFindFirstMock.mockResolvedValue({ id: 2 });
    h.transmissionFindFirstMock.mockResolvedValue({ id: 3 });
    h.updateMock.mockResolvedValue({
      ...studentRow,
      category: { id: 2, name: "B" },
      transmissionType: { id: 3, name: "Manual" },
    });

    const res = await PATCH(
      req("PATCH", "http://school.example.com/api/admin/students/stu-1", {
        categoryName: "B",
        transmissionTypeName: "Manual",
      }) as any,
      routeContext,
    );

    expect(res.status).toBe(200);
    const updateArg = h.updateMock.mock.calls[0]?.[0];
    expect(updateArg.data.category).toEqual({ connect: { id: 2 } });
    expect(updateArg.data.transmissionType).toEqual({ connect: { id: 3 } });
    const body = await res.json();
    expect(body.data.student.category).toEqual({ id: 2, name: "B" });
    expect(body.data.student.transmissionType).toEqual({
      id: 3,
      name: "Manual",
    });
  });

  it("persists address on student profile", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.findFirstMock.mockResolvedValue({ id: "stu-1" });
    h.updateMock.mockResolvedValue({
      ...studentRow,
      address: "Rua das Flores 10",
    });

    const res = await PATCH(
      req("PATCH", "http://school.example.com/api/admin/students/stu-1", {
        address: "Rua das Flores 10",
      }) as any,
      routeContext,
    );

    expect(res.status).toBe(200);
    const updateArg = h.updateMock.mock.calls[0]?.[0];
    expect(updateArg.data.address).toBe("Rua das Flores 10");
  });

  it("clears address when null is sent", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.findFirstMock.mockResolvedValue({ id: "stu-1" });
    h.updateMock.mockResolvedValue({ ...studentRow, address: null });

    const res = await PATCH(
      req("PATCH", "http://school.example.com/api/admin/students/stu-1", {
        address: null,
      }) as any,
      routeContext,
    );

    expect(res.status).toBe(200);
    const updateArg = h.updateMock.mock.calls[0]?.[0];
    expect(updateArg.data.address).toBeNull();
  });

  it("returns 400 when category name is unknown", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.findFirstMock.mockResolvedValue({ id: "stu-1" });
    h.categoryFindFirstMock.mockResolvedValue(null);

    const res = await PATCH(
      req("PATCH", "http://school.example.com/api/admin/students/stu-1", {
        categoryName: "Z",
      }) as any,
      routeContext,
    );

    expect(res.status).toBe(400);
    expect(h.updateMock).not.toHaveBeenCalled();
  });

  it("allows email patch for MANUAL_ONLY without linked user", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.findFirstMock
      .mockResolvedValueOnce({
        id: "stu-1",
        organizationId: "org-a",
        appAccessMode: "MANUAL_ONLY",
        userId: null,
        email: null,
        userInvitations: [],
      })
      .mockResolvedValueOnce({ id: "stu-1" });
    h.updateMock.mockResolvedValue({
      ...studentRow,
      email: "new@school.test",
    });

    const res = await PATCH(
      req("PATCH", "http://school.example.com/api/admin/students/stu-1", {
        email: "new@school.test",
      }) as any,
      routeContext,
    );

    expect(res.status).toBe(200);
    const updateArg = h.updateMock.mock.calls[0]?.[0];
    expect(updateArg.data.email).toBe("new@school.test");
  });

  it("returns 409 use_change_email_flow when patching APP_USER email", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.findFirstMock.mockResolvedValueOnce({
      id: "stu-1",
      organizationId: "org-a",
      appAccessMode: "APP_USER",
      userId: "user-1",
      email: "old@school.test",
      userInvitations: [],
    });

    const res = await PATCH(
      req("PATCH", "http://school.example.com/api/admin/students/stu-1", {
        email: "new@school.test",
      }) as any,
      routeContext,
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("use_change_email_flow");
    expect(h.updateMock).not.toHaveBeenCalled();
  });

  it("returns 409 use_change_email_flow when patching INVITED email", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.findFirstMock.mockResolvedValueOnce({
      id: "stu-1",
      organizationId: "org-a",
      appAccessMode: "INVITED",
      userId: null,
      email: "old@school.test",
      userInvitations: [{ id: "inv-1" }],
    });

    const res = await PATCH(
      req("PATCH", "http://school.example.com/api/admin/students/stu-1", {
        email: "new@school.test",
      }) as any,
      routeContext,
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("use_change_email_flow");
    expect(h.updateMock).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/students/[id]", () => {
  it("deletes eligible student and returns success envelope", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    deleteStudentMock.mockResolvedValue({ ok: true });

    const res = await DELETE(
      req(
        "DELETE",
        "http://school.example.com/api/admin/students/stu-1",
      ) as any,
      routeContext,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe(true);
    expect(deleteStudentMock).toHaveBeenCalledWith({
      organizationId: "org-a",
      studentId: "stu-1",
    });
  });

  it("returns 404 when student not in organization", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    deleteStudentMock.mockResolvedValue({ ok: false, notFound: true });

    const res = await DELETE(
      req(
        "DELETE",
        "http://school.example.com/api/admin/students/stu-9",
      ) as any,
      { params: { id: "stu-9" } },
    );

    expect(res.status).toBe(404);
  });

  it("returns 409 with stable code when delete blocked", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    deleteStudentMock.mockResolvedValue({
      ok: false,
      notFound: false,
      code: "student_has_lessons",
      codes: ["student_has_lessons"],
    });

    const res = await DELETE(
      req(
        "DELETE",
        "http://school.example.com/api/admin/students/stu-1",
      ) as any,
      routeContext,
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("student_has_lessons");
    expect(body.codes).toEqual(["student_has_lessons"]);
  });

  it("returns 401 for non-SUPER_ADMIN", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "inst-1", role: "INSTRUCTOR", organizationId: "org-a" },
    });

    const res = await DELETE(
      req(
        "DELETE",
        "http://school.example.com/api/admin/students/stu-1",
      ) as any,
      routeContext,
    );

    expect(res.status).toBe(401);
    expect(deleteStudentMock).not.toHaveBeenCalled();
  });

  it("blocks demo org via user-management guard", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-demo" },
    });
    rejectDemoMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Demo restricted",
          code: "demo_restricted_action",
        }),
        { status: 403 },
      ),
    );

    const res = await DELETE(
      req(
        "DELETE",
        "http://school.example.com/api/admin/students/stu-1",
      ) as any,
      routeContext,
    );

    expect(res.status).toBe(403);
    expect(deleteStudentMock).not.toHaveBeenCalled();
  });
});
