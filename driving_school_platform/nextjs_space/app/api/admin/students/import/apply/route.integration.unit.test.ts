import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findManyMock = vi.fn();
  const createMock = vi.fn();
  const transactionMock = vi.fn();
  const userCreateMock = vi.fn();
  const invitationCreateMock = vi.fn();
  const prismaMock = {
    student: {
      findMany: findManyMock,
      create: createMock,
    },
    user: { create: userCreateMock },
    userInvitation: { create: invitationCreateMock },
    $transaction: transactionMock,
  };
  return {
    prismaMock,
    findManyMock,
    createMock,
    transactionMock,
    userCreateMock,
    invitationCreateMock,
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

import { POST } from "./route";
import { getServerSession } from "next-auth";
import {
  assertUserTenantHost,
  rejectDemoUserManagementMutation,
} from "@/lib/users/user-route-access";
import { STUDENT_IMPORT_CSV_HEADERS } from "@/lib/import-export/import-export-contracts";

const getServerSessionMock = getServerSession as unknown as ReturnType<
  typeof vi.fn
>;
const assertUserTenantHostMock = assertUserTenantHost as unknown as ReturnType<
  typeof vi.fn
>;
const rejectDemoUserManagementMutationMock =
  rejectDemoUserManagementMutation as unknown as ReturnType<typeof vi.fn>;

const CSV_HEADER = STUDENT_IMPORT_CSV_HEADERS.join(";");

function req(body: unknown): Request {
  return new Request(
    "http://school.example.com/api/admin/students/import/apply",
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
  h.createMock.mockResolvedValue({ id: "student-new" });
  h.transactionMock.mockImplementation(async (callback: unknown) => {
    if (typeof callback === "function") {
      return callback(h.prismaMock);
    }
    return callback;
  });
  assertUserTenantHostMock.mockResolvedValue(null);
  rejectDemoUserManagementMutationMock.mockResolvedValue(null);
});

describe("POST /api/admin/students/import/apply", () => {
  it("returns 403 for demo org before import apply and performs no writes", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-demo" },
    });
    rejectDemoUserManagementMutationMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "This action is restricted in the public demo environment.",
          code: "demo_restricted_action",
        }),
        { status: 403 },
      ),
    );

    const res = await POST(
      req({
        format: "csv",
        content: `${CSV_HEADER}\n26001;26;1;João;Silva;;;`,
      }) as any,
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("demo_restricted_action");
    expect(rejectDemoUserManagementMutationMock).toHaveBeenCalledWith(
      "org-demo",
    );
    expect(h.findManyMock).not.toHaveBeenCalled();
    expect(h.transactionMock).not.toHaveBeenCalled();
    expect(h.createMock).not.toHaveBeenCalled();
  });

  it("returns 401 for INSTRUCTOR", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "INSTRUCTOR", organizationId: "org-a" },
    });

    const res = await POST(req({ format: "json", rows: [] }) as any);
    expect(res.status).toBe(401);
    expect(h.createMock).not.toHaveBeenCalled();
  });

  it("returns 401 for STUDENT", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "STUDENT", organizationId: "org-a" },
    });

    const res = await POST(req({ format: "json", rows: [] }) as any);
    expect(res.status).toBe(401);
  });

  it("applies valid CSV for SUPER_ADMIN and creates students", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await POST(
      req({
        format: "csv",
        content: `${CSV_HEADER}\n26001;26;1;João;Silva;912345678;joao@example.com;2026-05-29`,
        mode: "createOnly",
      }) as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.applied).toBe(true);
    expect(body.data.createdCount).toBe(1);
    expect(body.data.report.validRows).toBe(1);
    expect(h.createMock).toHaveBeenCalledTimes(1);

    const data = h.createMock.mock.calls[0]?.[0]?.data;
    expect(data.organizationId).toBe("org-a");
    expect(data.appAccessMode).toBe("MANUAL_ONLY");
    expect(data.schoolStudentIdSource).toBe("IMPORT");
    expect(data.userId).toBeNull();
  });

  it("does not call student.create when a row is invalid", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await POST(
      req({
        format: "csv",
        content: `${CSV_HEADER}\n26001;26;1;;;`,
      }) as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.applied).toBe(false);
    expect(body.data.createdCount).toBe(0);
    expect(h.transactionMock).not.toHaveBeenCalled();
    expect(h.createMock).not.toHaveBeenCalled();
  });

  it("does not write when duplicate exists in database", async () => {
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
    expect(body.data.applied).toBe(false);
    expect(h.createMock).not.toHaveBeenCalled();
    expect(body.data.report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "duplicate_school_student_id" }),
      ]),
    );
  });

  it("scopes duplicate lookup to session organizationId", async () => {
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

    const res = await POST(req({ format: "xml", content: "x" }) as any);
    expect(res.status).toBe(400);
    expect(h.createMock).not.toHaveBeenCalled();
  });

  it("returns 400 for unsupported mode", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await POST(
      req({
        format: "json",
        mode: "updateMerge",
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
    expect(res.status).toBe(400);
  });

  it("does not create User or invitation records", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    await POST(
      req({
        format: "json",
        rows: [
          {
            schoolStudentId: "26001",
            yearSuffix: "26",
            sequence: 1,
            firstName: "João",
            email: "joao@example.com",
          },
        ],
      }) as any,
    );

    expect(h.userCreateMock).not.toHaveBeenCalled();
    expect(h.invitationCreateMock).not.toHaveBeenCalled();
  });
});
