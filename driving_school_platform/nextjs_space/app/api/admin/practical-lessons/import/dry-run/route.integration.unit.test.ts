import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const studentFindManyMock = vi.fn();
  const instructorFindManyMock = vi.fn();
  const lessonFindManyMock = vi.fn();
  const lessonCreateMock = vi.fn();
  const lessonUpdateMock = vi.fn();
  const prismaMock = {
    student: { findMany: studentFindManyMock },
    instructor: { findMany: instructorFindManyMock },
    lesson: {
      findMany: lessonFindManyMock,
      create: lessonCreateMock,
      update: lessonUpdateMock,
    },
  };
  return {
    prismaMock,
    studentFindManyMock,
    instructorFindManyMock,
    lessonFindManyMock,
    lessonCreateMock,
    lessonUpdateMock,
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
  };
});

import { POST } from "./route";
import { getServerSession } from "next-auth";
import { assertUserTenantHost } from "@/lib/users/user-route-access";
import { PRACTICAL_LESSON_IMPORT_CSV_HEADERS } from "@/lib/import-export/import-export-contracts";
import { LESSON_TYPES } from "@/lib/constants";

const getServerSessionMock = getServerSession as unknown as ReturnType<
  typeof vi.fn
>;
const assertUserTenantHostMock = assertUserTenantHost as unknown as ReturnType<
  typeof vi.fn
>;

const CSV_HEADER = PRACTICAL_LESSON_IMPORT_CSV_HEADERS.join(";");

function req(body: unknown): Request {
  return new Request(
    "http://school.example.com/api/admin/practical-lessons/import/dry-run",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  h.studentFindManyMock.mockResolvedValue([
    { id: "student-1", schoolStudentId: "26001" },
  ]);
  h.instructorFindManyMock.mockResolvedValue([
    {
      userId: "instructor-user-1",
      user: { email: "instrutor@school.test" },
    },
  ]);
  h.lessonFindManyMock.mockResolvedValue([]);
  assertUserTenantHostMock.mockResolvedValue(null);
});

describe("POST /api/admin/practical-lessons/import/dry-run", () => {
  it("returns 401 for INSTRUCTOR", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "INSTRUCTOR", organizationId: "org-a" },
    });

    const res = await POST(req({ format: "json", rows: [] }) as any);
    expect(res.status).toBe(401);
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
    expect(h.lessonUpdateMock).not.toHaveBeenCalled();
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
            practicalLessonNumber: 2,
            lessonDate: "2026-05-29",
            startTime: "09:00",
            instructorEmail: "instrutor@school.test",
          },
        ],
      }) as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalRows).toBe(1);
    expect(body.data.validRows).toBe(1);
    expect(body.data.preview[0].normalized.studentId).toBe("student-1");
    expect(body.data.preview[0].normalized.instructorId).toBe(
      "instructor-user-1",
    );
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
    expect(h.lessonUpdateMock).not.toHaveBeenCalled();
  });

  it("scopes Student and Instructor lookups to session organizationId", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    await POST(
      req({
        format: "csv",
        organizationId: "org-b",
        content: `${CSV_HEADER}\n26001;1;2026-05-29;09:00;60;instrutor@school.test;`,
      }) as any,
    );

    expect(h.studentFindManyMock.mock.calls[0]?.[0].where.organizationId).toBe(
      "org-a",
    );
    expect(
      h.instructorFindManyMock.mock.calls[0]?.[0].where.organizationId,
    ).toBe("org-a");
    expect(h.lessonFindManyMock.mock.calls[0]?.[0].where.organizationId).toBe(
      "org-a",
    );
    expect(h.lessonFindManyMock.mock.calls[0]?.[0].where.lessonType).toBe(
      LESSON_TYPES.DRIVING,
    );
  });

  it("checks existing DRIVING practical lesson numbers for duplicate detection", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });
    h.lessonFindManyMock.mockResolvedValue([
      { studentId: "student-1", practicalLessonNumber: 2 },
    ]);

    const res = await POST(
      req({
        format: "json",
        rows: [
          {
            schoolStudentId: "26001",
            practicalLessonNumber: 2,
            lessonDate: "2026-05-29",
            startTime: "09:00",
            instructorEmail: "instrutor@school.test",
          },
        ],
      }) as any,
    );

    const body = await res.json();
    expect(body.data.validRows).toBe(0);
    expect(body.data.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "duplicate_practical_lesson_number" }),
      ]),
    );
    expect(
      JSON.stringify(h.lessonFindManyMock.mock.calls[0]?.[0].select),
    ).not.toContain("passwordHash");
  });

  it("returns 400 for invalid format", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await POST(req({ format: "xml", content: "x" }) as any);
    expect(res.status).toBe(400);
    expect(h.studentFindManyMock).not.toHaveBeenCalled();
  });

  it("returns 400 when CSV content is missing", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await POST(req({ format: "csv" }) as any);
    expect(res.status).toBe(400);
  });
});
