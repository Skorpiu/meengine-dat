import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findManyMock = vi.fn();
  const createMock = vi.fn();
  const updateMock = vi.fn();
  const prismaMock = {
    student: {
      findMany: findManyMock,
      create: createMock,
      update: updateMock,
    },
  };
  return { prismaMock, findManyMock, createMock, updateMock };
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

import { POST } from "./route";
import { getServerSession } from "next-auth";
import { assertUserTenantHost } from "@/lib/users/user-route-access";
import { STUDENT_IMPORT_CSV_HEADERS } from "@/lib/import-export/import-export-contracts";

const getServerSessionMock = getServerSession as unknown as ReturnType<
  typeof vi.fn
>;
const assertUserTenantHostMock = assertUserTenantHost as unknown as ReturnType<
  typeof vi.fn
>;

const CSV_HEADER = STUDENT_IMPORT_CSV_HEADERS.join(";");

function req(body: unknown): Request {
  return new Request(
    "http://school.example.com/api/admin/students/import/dry-run",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  h.findManyMock.mockResolvedValue([]);
  h.createMock.mockResolvedValue({});
  h.updateMock.mockResolvedValue({});
  assertUserTenantHostMock.mockResolvedValue(null);
});

describe("POST /api/admin/students/import/dry-run", () => {
  it("returns 401 for INSTRUCTOR", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "INSTRUCTOR", organizationId: "org-a" },
    });

    const res = await POST(req({ format: "json", rows: [] }) as any);
    expect(res.status).toBe(401);
    expect(h.findManyMock).not.toHaveBeenCalled();
    expect(h.createMock).not.toHaveBeenCalled();
    expect(h.updateMock).not.toHaveBeenCalled();
  });

  it("returns 401 for STUDENT", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "STUDENT", organizationId: "org-a" },
    });

    const res = await POST(req({ format: "json", rows: [] }) as any);
    expect(res.status).toBe(401);
  });

  it("returns dry-run report for SUPER_ADMIN with JSON rows", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await POST(
      req({
        format: "json",
        rows: [
          {
            schoolStudentId: "26001",
            yearSuffix: "26",
            sequence: 1,
            firstName: "João",
          },
        ],
      }) as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalRows).toBe(1);
    expect(body.data.validRows).toBe(1);
    expect(body.data.preview[0].normalized.schoolStudentId).toBe("26001");
    expect(h.createMock).not.toHaveBeenCalled();
    expect(h.updateMock).not.toHaveBeenCalled();
  });

  it("runs duplicate lookup scoped to session organizationId", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.findManyMock.mockResolvedValue([{ schoolStudentId: "26001" }]);

    const res = await POST(
      req({
        format: "csv",
        content: `${CSV_HEADER}\n26001;26;1;João;;;`,
      }) as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.validRows).toBe(0);
    expect(body.data.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "duplicate_school_student_id" }),
      ]),
    );

    const findArg = h.findManyMock.mock.calls[0]?.[0];
    expect(findArg.where.organizationId).toBe("org-a");
    expect(findArg.where.schoolStudentId).toEqual({ in: ["26001"] });
    expect(JSON.stringify(findArg.select)).not.toContain("passwordHash");
  });

  it("ignores organizationId in body for tenant scope", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    await POST(
      req({
        format: "json",
        organizationId: "org-b",
        rows: [
          {
            schoolStudentId: "26001",
            yearSuffix: "26",
            sequence: 1,
            firstName: "João",
          },
        ],
      }) as any,
    );

    expect(h.findManyMock.mock.calls[0]?.[0].where.organizationId).toBe(
      "org-a",
    );
  });

  it("returns 400 for invalid format", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await POST(
      req({
        format: "xml",
        content: "x",
      }) as any,
    );
    expect(res.status).toBe(400);
    expect(h.findManyMock).not.toHaveBeenCalled();
  });

  it("rejects CSV row with partial sequence 1abc", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await POST(
      req({
        format: "csv",
        content: `${CSV_HEADER}\n26001;26;1abc;João;;;`,
      }) as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.validRows).toBe(0);
    expect(body.data.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "sequence",
          code: "unsupported_value",
        }),
      ]),
    );
  });

  it("returns 400 when CSV content is missing", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await POST(req({ format: "csv" }) as any);
    expect(res.status).toBe(400);
  });
});
