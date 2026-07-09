import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findManyMock = vi.fn();
  const studentFindFirstMock = vi.fn();
  const prismaMock = {
    lesson: {
      findMany: findManyMock,
    },
    student: {
      findFirst: studentFindFirstMock,
    },
  };
  return { prismaMock, findManyMock, studentFindFirstMock };
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

vi.mock("@/lib/audit/lesson-audit", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/audit/lesson-audit")
  >("@/lib/audit/lesson-audit");
  return {
    ...actual,
    writeLessonExportDownloadAuditEvent: vi.fn(),
  };
});

import { GET } from "./route";
import { getServerSession } from "next-auth";
import { assertUserTenantHost } from "@/lib/users/user-route-access";
import { writeLessonExportDownloadAuditEvent } from "@/lib/audit/lesson-audit";
import { PRACTICAL_LESSON_EXPORT_SELECT } from "@/lib/lessons/practical-lesson-export-queries";
import { PRACTICAL_LESSON_EXPORT_CSV_HEADERS } from "@/lib/import-export/import-export-contracts";
import { LESSON_TYPES } from "@/lib/constants";

const getServerSessionMock = getServerSession as unknown as ReturnType<
  typeof vi.fn
>;
const assertUserTenantHostMock = assertUserTenantHost as unknown as ReturnType<
  typeof vi.fn
>;
const writeLessonExportDownloadAuditEventMock =
  writeLessonExportDownloadAuditEvent as unknown as ReturnType<typeof vi.fn>;

const exportLessonRow = {
  lessonDate: new Date("2026-05-29T10:00:00.000Z"),
  startTime: "09:00",
  endTime: "10:00",
  durationMinutes: 60,
  practicalLessonNumber: 2,
  lessonSource: "MANUAL",
  status: "COMPLETED",
  adminNotes: "Histórico manual",
  student: { schoolStudentId: "26001" },
  instructor: {
    user: {
      email: "instrutor@school.test",
      firstName: "Ana",
      lastName: "Costa",
    },
  },
};

function req(url: string): Request {
  return new Request(url, { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  h.findManyMock.mockResolvedValue([exportLessonRow]);
  h.studentFindFirstMock.mockResolvedValue(null);
  assertUserTenantHostMock.mockResolvedValue(null);
  writeLessonExportDownloadAuditEventMock.mockResolvedValue({
    ok: true,
    id: "audit-export-1",
  });
});

describe("GET /api/admin/practical-lessons/export", () => {
  it("returns 401 for INSTRUCTOR role", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "INSTRUCTOR", organizationId: "org-a" },
    });

    const res = await GET(
      req(
        "http://school.example.com/api/admin/practical-lessons/export",
      ) as any,
    );
    expect(res.status).toBe(401);
    expect(h.findManyMock).not.toHaveBeenCalled();
  });

  it("returns 401 for STUDENT role", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "STUDENT", organizationId: "org-a" },
    });

    const res = await GET(
      req(
        "http://school.example.com/api/admin/practical-lessons/export",
      ) as any,
    );
    expect(res.status).toBe(401);
    expect(h.findManyMock).not.toHaveBeenCalled();
  });

  it("exports CSV with expected header and no internal fields", async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: "admin-1",
        role: "SUPER_ADMIN",
        organizationId: "org-a",
        email: "admin@school.test",
      },
    });

    const res = await GET(
      req(
        "http://school.example.com/api/admin/practical-lessons/export?format=csv&source=MANUAL&from=2026-05-01&to=2026-05-31",
      ) as any,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toContain(
      "practical-lessons-export-",
    );

    const csv = await res.text();
    const [header, data] = csv.split("\n");
    expect(header).toBe(PRACTICAL_LESSON_EXPORT_CSV_HEADERS.join(";"));
    expect(data).toContain("26001");
    expect(data).toContain("MANUAL");
    expect(data).toContain("instrutor@school.test");
    expect(csv).not.toContain("passwordHash");
    expect(csv).not.toContain("organizationId");

    const arg = h.findManyMock.mock.calls[0]?.[0];
    expect(arg.where.organizationId).toBe("org-a");
    expect(arg.where.lessonType).toBe(LESSON_TYPES.DRIVING);
    expect(arg.select).toEqual(PRACTICAL_LESSON_EXPORT_SELECT);
    expect(JSON.stringify(arg.select)).not.toContain("passwordHash");

    expect(writeLessonExportDownloadAuditEventMock).toHaveBeenCalledTimes(1);
    expect(writeLessonExportDownloadAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        actor: {
          userId: "admin-1",
          role: "SUPER_ADMIN",
          email: "admin@school.test",
        },
        format: "csv",
        exportedCount: 1,
        hasFilters: true,
        filterKeys: ["source", "from", "to"],
        requestContext: expect.objectContaining({
          requestMethod: "GET",
          requestPath: "/api/admin/practical-lessons/export",
        }),
      }),
    );

    const auditPayload = JSON.stringify(
      writeLessonExportDownloadAuditEventMock.mock.calls[0]?.[0],
    );
    expect(auditPayload).not.toContain("Histórico manual");
    expect(auditPayload).not.toContain("instrutor@school.test");
    expect(auditPayload).not.toContain("26001");
  });

  it("exports JSON with expected envelope shape", async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: "admin-1",
        role: "SUPER_ADMIN",
        organizationId: "org-a",
        email: "admin@school.test",
      },
    });

    const res = await GET(
      req(
        "http://school.example.com/api/admin/practical-lessons/export?format=json",
      ) as any,
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.formatVersion).toBe(1);
    expect(body.entity).toBe("practicalLessons");
    expect(typeof body.exportedAt).toBe("string");
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0]).toEqual({
      schoolStudentId: "26001",
      practicalLessonNumber: 2,
      lessonDate: "2026-05-29",
      startTime: "09:00",
      durationMinutes: 60,
      instructorEmail: "instrutor@school.test",
      instructorName: "Ana Costa",
      lessonSource: "MANUAL",
      status: "COMPLETED",
      notes: "Histórico manual",
    });
    expect(body.rows[0]).not.toHaveProperty("id");
    expect(body.rows[0]).not.toHaveProperty("organizationId");

    expect(writeLessonExportDownloadAuditEventMock).toHaveBeenCalledTimes(1);
    expect(writeLessonExportDownloadAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        format: "json",
        exportedCount: 1,
        hasFilters: false,
        filterKeys: [],
      }),
    );
  });

  it("scopes export by session organizationId regardless of query", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    await GET(
      req(
        "http://school.example.com/api/admin/practical-lessons/export?organizationId=org-b",
      ) as any,
    );

    expect(h.findManyMock.mock.calls[0]?.[0].where.organizationId).toBe(
      "org-a",
    );
  });

  it("filters by lessonSource when source query param is provided", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    await GET(
      req(
        "http://school.example.com/api/admin/practical-lessons/export?source=MANUAL",
      ) as any,
    );

    expect(h.findManyMock.mock.calls[0]?.[0].where.lessonSource).toBe("MANUAL");
  });

  it("filters by schoolStudentId within organization", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    await GET(
      req(
        "http://school.example.com/api/admin/practical-lessons/export?schoolStudentId=26001",
      ) as any,
    );

    expect(h.findManyMock.mock.calls[0]?.[0].where.student).toEqual({
      is: {
        organizationId: "org-a",
        schoolStudentId: "26001",
      },
    });
  });

  it("resolves studentId filter within organization", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.studentFindFirstMock.mockResolvedValue({ id: "student-1" });

    await GET(
      req(
        "http://school.example.com/api/admin/practical-lessons/export?studentId=student-1",
      ) as any,
    );

    expect(h.studentFindFirstMock.mock.calls[0]?.[0].where).toEqual({
      id: "student-1",
      organizationId: "org-a",
    });
    expect(h.findManyMock.mock.calls[0]?.[0].where.studentId).toBe("student-1");
  });

  it("rejects invalid format", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await GET(
      req(
        "http://school.example.com/api/admin/practical-lessons/export?format=xml",
      ) as any,
    );
    expect(res.status).toBe(400);
    expect(h.findManyMock).not.toHaveBeenCalled();
    expect(writeLessonExportDownloadAuditEventMock).not.toHaveBeenCalled();
  });

  it("does not audit when export returns 400 from invalid filters", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await GET(
      req(
        "http://school.example.com/api/admin/practical-lessons/export?from=bad-date",
      ) as any,
    );

    expect(res.status).toBe(400);
    expect(writeLessonExportDownloadAuditEventMock).not.toHaveBeenCalled();
  });

  it("still exports when audit write fails", async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: "admin-1",
        role: "SUPER_ADMIN",
        organizationId: "org-a",
        email: "admin@school.test",
      },
    });
    writeLessonExportDownloadAuditEventMock.mockResolvedValue({
      ok: false,
      error: "db_down",
    });

    const res = await GET(
      req(
        "http://school.example.com/api/admin/practical-lessons/export?format=csv",
      ) as any,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(writeLessonExportDownloadAuditEventMock).toHaveBeenCalledTimes(1);
  });
});
