import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findManyMock = vi.fn();
  const findFirstMock = vi.fn();
  const createMock = vi.fn();
  const writeStudentCreateAuditEventMock = vi.fn();

  const prismaMock = {
    student: {
      findMany: findManyMock,
      findFirst: findFirstMock,
      create: createMock,
    },
  };

  return {
    prismaMock,
    findManyMock,
    findFirstMock,
    createMock,
    writeStudentCreateAuditEventMock,
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

vi.mock("@/lib/audit/student-audit", () => ({
  buildStudentCreateAuditContextFromRecord: (student: {
    appAccessMode: string;
    email: string | null;
    address: string | null;
    schoolStudentId: string | null;
    category: unknown;
    transmissionType: unknown;
    userId: string | null;
  }) => ({
    linkedUserId: student.userId,
    appAccessMode: student.appAccessMode,
    hasLicenseCategory: student.category != null,
    hasTransmissionType: student.transmissionType != null,
    hasEmail: Boolean(student.email?.trim()),
    hasAddress: Boolean(student.address?.trim()),
    schoolStudentIdPresent: Boolean(student.schoolStudentId?.trim()),
    createdVia: "manual" as const,
  }),
  writeStudentCreateAuditEvent: (...args: unknown[]) =>
    h.writeStudentCreateAuditEventMock(...args),
}));

import { GET, POST } from "./route";
import { getServerSession } from "next-auth";
import {
  assertUserTenantHost,
  rejectDemoUserManagementMutation,
} from "@/lib/users/user-route-access";
import {
  STUDENT_RECORD_LESSON_SELECT,
  STUDENT_RECORD_SELECT,
} from "@/lib/students/student-record-dto";

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
  userInvitations: [] as {
    id: string;
    email: string;
    expiresAt: Date;
    status: string;
  }[],
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
  h.writeStudentCreateAuditEventMock.mockResolvedValue({
    ok: true,
    id: "audit-1",
  });
  assertUserTenantHostMock.mockResolvedValue(null);
  rejectDemoMock.mockResolvedValue(null);
});

describe("GET /api/admin/students", () => {
  it("allows INSTRUCTOR to list operational students with minimal lesson DTO", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "INSTRUCTOR", organizationId: "org-a" },
    });
    h.findManyMock.mockResolvedValue([manualStudentRow]);

    const res = await GET(
      req("GET", "http://school.example.com/api/admin/students") as any,
    );
    expect(res.status).toBe(200);
    expect(h.findManyMock).toHaveBeenCalled();

    const arg = h.findManyMock.mock.calls[0]?.[0];
    expect(arg.select).toEqual(STUDENT_RECORD_LESSON_SELECT);

    const body = await res.json();
    const student = body.data.students[0];
    expect(student.id).toBe("stu-1");
    expect(student.schoolStudentId).toBe("26001");
    expect(student).not.toHaveProperty("email");
    expect(student).not.toHaveProperty("phoneNumber");
    expect(student).not.toHaveProperty("enrollmentDate");
    expect(student).not.toHaveProperty("createdAt");
    expect(student).not.toHaveProperty("updatedAt");
    if (student.user) {
      expect(student.user).not.toHaveProperty("email");
    }
  });

  it("returns 401 for STUDENT role", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "STUDENT", organizationId: "org-a" },
    });

    const res = await GET(
      req("GET", "http://school.example.com/api/admin/students") as any,
    );
    expect(res.status).toBe(401);
    expect(h.findManyMock).not.toHaveBeenCalled();
  });

  it("returns full admin DTO for SUPER_ADMIN", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.findManyMock.mockResolvedValue([manualStudentRow]);

    const res = await GET(
      req("GET", "http://school.example.com/api/admin/students") as any,
    );
    expect(res.status).toBe(200);

    const arg = h.findManyMock.mock.calls[0]?.[0];
    expect(arg.select).toEqual(STUDENT_RECORD_SELECT);

    const body = await res.json();
    const student = body.data.students[0];
    expect(student.email).toBe("joao@school.test");
    expect(student.phoneNumber).toBe("+351900000000");
    expect(student.enrollmentDate).toBeTruthy();
    expect(student.createdAt).toBeTruthy();
    expect(student.updatedAt).toBeTruthy();
    expect(student.pendingInvitation).toBeNull();
  });

  it("includes safe pendingInvitation metadata without token fields", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.findManyMock.mockResolvedValue([
      {
        ...manualStudentRow,
        appAccessMode: "INVITED",
        userInvitations: [
          {
            id: "inv-1",
            email: "joao@school.test",
            expiresAt: new Date("2099-01-01T12:00:00.000Z"),
            status: "PENDING",
          },
        ],
      },
    ]);

    const res = await GET(
      req("GET", "http://school.example.com/api/admin/students") as any,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.students[0].pendingInvitation).toEqual({
      invitationId: "inv-1",
      email: "joao@school.test",
      expiresAt: "2099-01-01T12:00:00.000Z",
      status: "PENDING",
    });
    expect(body.data.students[0].pendingInvitation).not.toHaveProperty(
      "tokenHash",
    );
    expect(body.data.students[0].pendingInvitation).not.toHaveProperty(
      "inviteLink",
    );

    const arg = h.findManyMock.mock.calls[0]?.[0];
    expect(arg.select.userInvitations).toBeDefined();
    expect(JSON.stringify(arg.select)).not.toContain("tokenHash");
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
  it("creates MANUAL_ONLY student without User and emits audit", async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: "admin-1",
        role: "SUPER_ADMIN",
        organizationId: "org-a",
        email: "admin@school.test",
      },
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

    expect(h.writeStudentCreateAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        actor: {
          userId: "admin-1",
          role: "SUPER_ADMIN",
          email: "admin@school.test",
        },
        studentId: "stu-1",
        linkedUserId: null,
        appAccessMode: "MANUAL_ONLY",
        hasLicenseCategory: false,
        hasTransmissionType: false,
        hasEmail: true,
        hasAddress: false,
        schoolStudentIdPresent: true,
        createdVia: "manual",
        requestContext: expect.objectContaining({
          requestMethod: "POST",
          requestPath: "/api/admin/students",
        }),
      }),
    );

    const auditPayload = JSON.stringify(
      h.writeStudentCreateAuditEventMock.mock.calls[0]?.[0],
    );
    expect(auditPayload).not.toContain("João");
    expect(auditPayload).not.toContain("joao@school.test");
    expect(auditPayload).not.toContain("26001");
  });

  it("persists optional address on manual create", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.createMock.mockResolvedValue({
      ...manualStudentRow,
      address: "Avenida Central 5",
    });

    const res = await POST(
      req("POST", "http://school.example.com/api/admin/students", {
        firstName: "João",
        yearSuffix: "26",
        sequenceNumber: 1,
        address: "Avenida Central 5",
      }) as any,
    );

    expect(res.status).toBe(201);
    const createArg = h.createMock.mock.calls[0]?.[0];
    expect(createArg.data.address).toBe("Avenida Central 5");
    expect(h.writeStudentCreateAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hasAddress: true,
      }),
    );
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
    expect(h.writeStudentCreateAuditEventMock).not.toHaveBeenCalled();
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
    expect(h.writeStudentCreateAuditEventMock).not.toHaveBeenCalled();
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
    expect(h.writeStudentCreateAuditEventMock).not.toHaveBeenCalled();
  });

  it("blocks demo org mutations", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-demo" },
    });
    rejectDemoMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "demo_restricted_action" }), {
        status: 403,
      }),
    );

    const res = await POST(
      req("POST", "http://school.example.com/api/admin/students", {
        firstName: "Ana",
        yearSuffix: "26",
        sequenceNumber: 1,
      }) as any,
    );

    expect(res.status).toBe(403);
    expect(h.createMock).not.toHaveBeenCalled();
    expect(h.writeStudentCreateAuditEventMock).not.toHaveBeenCalled();
  });

  it("POST still returns 201 when audit write fails", async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: "admin-1",
        role: "SUPER_ADMIN",
        organizationId: "org-a",
        email: "admin@school.test",
      },
    });
    h.writeStudentCreateAuditEventMock.mockResolvedValue({
      ok: false,
      error: "db_down",
    });

    const res = await POST(
      req("POST", "http://school.example.com/api/admin/students", {
        firstName: "Ana",
        yearSuffix: "26",
        sequenceNumber: 1,
      }) as any,
    );

    expect(res.status).toBe(201);
    expect(h.writeStudentCreateAuditEventMock).toHaveBeenCalled();
    expect(h.createMock).toHaveBeenCalled();
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
