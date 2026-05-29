import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findManyMock = vi.fn();
  const findFirstMock = vi.fn();
  const createMock = vi.fn();

  const prismaMock = {
    student: {
      findMany: findManyMock,
      findFirst: findFirstMock,
      create: createMock,
    },
  };

  return { prismaMock, findManyMock, findFirstMock, createMock };
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

vi.mock("@/lib/tenant", () => ({
  guardTenantAuthenticatedRoute: vi.fn(),
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

import { GET, POST } from "./route";
import { getServerSession } from "next-auth";
import {
  assertUserTenantHost,
  rejectDemoUserManagementMutation,
} from "@/lib/users/user-route-access";
import { STUDENT_RECORD_SELECT } from "@/lib/students/student-record-dto";

const getServerSessionMock = getServerSession as unknown as ReturnType<
  typeof vi.fn
>;
const assertUserTenantHostMock = assertUserTenantHost as unknown as ReturnType<
  typeof vi.fn
>;
const rejectDemoMock =
  rejectDemoUserManagementMutation as unknown as ReturnType<typeof vi.fn>;

const manualStudentRow = {
  id: "stu-1",
  userId: null,
  firstName: "João",
  lastName: "Silva",
  email: "joao@school.test",
  phoneNumber: "+351900000000",
  schoolStudentId: "26001",
  schoolStudentYearSuffix: "26",
  schoolStudentSequence: 1,
  schoolStudentIdSource: "MANUAL",
  enrollmentDate: new Date("2026-05-29T10:00:00.000Z"),
  appAccessMode: "MANUAL_ONLY",
  createdAt: new Date("2026-05-29T10:00:00.000Z"),
  updatedAt: new Date("2026-05-29T10:00:00.000Z"),
  user: null,
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
  h.findManyMock.mockResolvedValue([]);
  h.findFirstMock.mockResolvedValue(null);
  h.createMock.mockResolvedValue(manualStudentRow);
  assertUserTenantHostMock.mockResolvedValue(null);
  rejectDemoMock.mockResolvedValue(null);
});

describe("GET /api/admin/students", () => {
  it("returns 401 for INSTRUCTOR", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "INSTRUCTOR", organizationId: "org-a" },
    });

    const res = await GET(
      req("GET", "http://school.example.com/api/admin/students") as any,
    );
    expect(res.status).toBe(401);
    expect(h.findManyMock).not.toHaveBeenCalled();
  });

  it("scopes list by organizationId", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await GET(
      req(
        "GET",
        "http://school.example.com/api/admin/students?search=261",
      ) as any,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const arg = h.findManyMock.mock.calls[0]?.[0];
    expect(arg.where.organizationId).toBe("org-a");
    expect(arg.where.OR).toEqual(
      expect.arrayContaining([{ schoolStudentId: "26001" }]),
    );
    expect(JSON.stringify(arg.select)).not.toContain("passwordHash");
  });

  it("does not expose passwordHash in select", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    await GET(
      req("GET", "http://school.example.com/api/admin/students") as any,
    );

    const arg = h.findManyMock.mock.calls[0]?.[0];
    expect(arg.select).toEqual(STUDENT_RECORD_SELECT);
    expect(JSON.stringify(arg.select)).not.toContain("passwordHash");
  });
});

describe("POST /api/admin/students", () => {
  it("creates MANUAL_ONLY student without User", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await POST(
      req("POST", "http://school.example.com/api/admin/students", {
        firstName: "João",
        lastName: "Silva",
        email: "joao@school.test",
        phoneNumber: "+351900000000",
        yearSuffix: "26",
        sequenceNumber: 1,
      }) as any,
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.student.schoolStudentId).toBe("26001");
    expect(body.data.student.appAccessMode).toBe("MANUAL_ONLY");
    expect(body.data.student.userId).toBeNull();

    const createArg = h.createMock.mock.calls[0]?.[0];
    expect(createArg.data.userId).toBeNull();
    expect(createArg.data.schoolStudentId).toBe("26001");
    expect(createArg.data.appAccessMode).toBe("MANUAL_ONLY");
    expect(createArg.data.schoolStudentIdSource).toBe("MANUAL");
    expect(createArg.data.studentIdNumber).toBeUndefined();
    expect(createArg.select).toEqual(STUDENT_RECORD_SELECT);
  });

  it("returns 409 when schoolStudentId already exists in org", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.findFirstMock.mockResolvedValue({ id: "existing" });

    const res = await POST(
      req("POST", "http://school.example.com/api/admin/students", {
        firstName: "Ana",
        yearSuffix: "26",
        sequenceNumber: 1,
      }) as any,
    );

    expect(res.status).toBe(409);
    expect(h.createMock).not.toHaveBeenCalled();
  });

  it("rejects invalid yearSuffix", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await POST(
      req("POST", "http://school.example.com/api/admin/students", {
        firstName: "Ana",
        yearSuffix: "2026",
        sequenceNumber: 1,
      }) as any,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code ?? body.error).toBe("year_suffix_must_be_2_digits");
  });

  it("rejects invalid sequenceNumber", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await POST(
      req("POST", "http://school.example.com/api/admin/students", {
        firstName: "Ana",
        yearSuffix: "26",
        sequenceNumber: 0,
      }) as any,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code ?? body.error).toBe("sequence_out_of_range");
  });

  it("checks duplicate only within organization", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.findFirstMock.mockResolvedValue(null);

    await POST(
      req("POST", "http://school.example.com/api/admin/students", {
        firstName: "Ana",
        yearSuffix: "26",
        sequenceNumber: 1,
      }) as any,
    );

    const findArg = h.findFirstMock.mock.calls[0]?.[0];
    expect(findArg.where.organizationId).toBe("org-a");
    expect(findArg.where.schoolStudentId).toBe("26001");
  });
});
