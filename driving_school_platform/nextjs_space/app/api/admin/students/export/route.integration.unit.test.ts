import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findManyMock = vi.fn();
  const prismaMock = {
    student: {
      findMany: findManyMock,
    },
  };
  return { prismaMock, findManyMock };
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
  };
});

import { GET } from "./route";
import { getServerSession } from "next-auth";
import { assertUserTenantHost } from "@/lib/users/user-route-access";
import { STUDENT_RECORD_EXPORT_SELECT } from "@/lib/students/student-record-queries";
import { STUDENT_EXPORT_CSV_HEADERS } from "@/lib/import-export/import-export-contracts";

const getServerSessionMock = getServerSession as unknown as ReturnType<
  typeof vi.fn
>;
const assertUserTenantHostMock = assertUserTenantHost as unknown as ReturnType<
  typeof vi.fn
>;

const exportStudentRow = {
  schoolStudentId: "26001",
  schoolStudentYearSuffix: "26",
  schoolStudentSequence: 1,
  firstName: "João",
  lastName: "Silva",
  phoneNumber: "+351900000000",
  email: "joao@school.test",
  enrollmentDate: new Date("2026-05-29T10:00:00.000Z"),
  appAccessMode: "MANUAL_ONLY",
};

function req(url: string): Request {
  return new Request(url, { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  h.findManyMock.mockResolvedValue([exportStudentRow]);
  assertUserTenantHostMock.mockResolvedValue(null);
});

describe("GET /api/admin/students/export", () => {
  it("returns 401 for INSTRUCTOR role", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "INSTRUCTOR", organizationId: "org-a" },
    });

    const res = await GET(
      req("http://school.example.com/api/admin/students/export") as any,
    );
    expect(res.status).toBe(401);
    expect(h.findManyMock).not.toHaveBeenCalled();
  });

  it("returns 401 for STUDENT role", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "STUDENT", organizationId: "org-a" },
    });

    const res = await GET(
      req("http://school.example.com/api/admin/students/export") as any,
    );
    expect(res.status).toBe(401);
    expect(h.findManyMock).not.toHaveBeenCalled();
  });

  it("exports CSV with expected header and no internal fields", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await GET(
      req(
        "http://school.example.com/api/admin/students/export?format=csv",
      ) as any,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");

    const csv = await res.text();
    const [header, data] = csv.split("\n");
    expect(header).toBe(STUDENT_EXPORT_CSV_HEADERS.join(";"));
    expect(data).toContain("26001");
    expect(data).toContain("João");
    expect(data).toContain("MANUAL_ONLY");
    expect(csv).not.toContain("passwordHash");
    expect(csv).not.toContain("organizationId");
    expect(csv).not.toContain("studentNumber");

    const arg = h.findManyMock.mock.calls[0]?.[0];
    expect(arg.where.organizationId).toBe("org-a");
    expect(arg.select).toEqual(STUDENT_RECORD_EXPORT_SELECT);
    expect(JSON.stringify(arg.select)).not.toContain("passwordHash");
    expect(JSON.stringify(arg.select)).not.toContain("user");
  });

  it("exports JSON with expected envelope shape", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await GET(
      req(
        "http://school.example.com/api/admin/students/export?format=json",
      ) as any,
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.formatVersion).toBe(1);
    expect(body.entity).toBe("students");
    expect(typeof body.exportedAt).toBe("string");
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0]).toEqual({
      schoolStudentId: "26001",
      yearSuffix: "26",
      sequence: 1,
      firstName: "João",
      lastName: "Silva",
      phoneNumber: "+351900000000",
      email: "joao@school.test",
      enrollmentDate: "2026-05-29",
      appAccessMode: "MANUAL_ONLY",
    });
    expect(body).not.toHaveProperty("passwordHash");
    expect(body.rows[0]).not.toHaveProperty("organizationId");
    expect(body.rows[0]).not.toHaveProperty("userId");
  });

  it("exports JSON with null sequence when school id parts are missing", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.findManyMock.mockResolvedValue([
      {
        ...exportStudentRow,
        schoolStudentId: null,
        schoolStudentYearSuffix: null,
        schoolStudentSequence: null,
      },
    ]);

    const res = await GET(
      req(
        "http://school.example.com/api/admin/students/export?format=json",
      ) as any,
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.rows[0].sequence).toBeNull();
    expect(body.rows[0].schoolStudentId).toBe("");
    expect(body.rows[0].yearSuffix).toBe("");
  });

  it("defaults to CSV when format is omitted", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await GET(
      req("http://school.example.com/api/admin/students/export") as any,
    );
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
  });

  it("scopes export by session organizationId regardless of query", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    await GET(
      req(
        "http://school.example.com/api/admin/students/export?organizationId=org-b",
      ) as any,
    );

    const arg = h.findManyMock.mock.calls[0]?.[0];
    expect(arg.where.organizationId).toBe("org-a");
  });

  it("rejects invalid format", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await GET(
      req(
        "http://school.example.com/api/admin/students/export?format=xml",
      ) as any,
    );
    expect(res.status).toBe(400);
    expect(h.findManyMock).not.toHaveBeenCalled();
  });
});
