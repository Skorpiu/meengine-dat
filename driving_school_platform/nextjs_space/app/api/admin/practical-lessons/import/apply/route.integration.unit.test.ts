import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const studentFindManyMock = vi.fn();
  const instructorFindManyMock = vi.fn();
  const lessonFindManyMock = vi.fn();
  const lessonCreateMock = vi.fn();
  const transactionMock = vi.fn();
  const userCreateMock = vi.fn();
  const invitationCreateMock = vi.fn();
  const resolveCategoryMock = vi.fn();
  const prismaMock = {
    student: { findMany: studentFindManyMock },
    instructor: { findMany: instructorFindManyMock },
    lesson: {
      findMany: lessonFindManyMock,
      create: lessonCreateMock,
    },
    user: { create: userCreateMock },
    userInvitation: { create: invitationCreateMock },
    $transaction: transactionMock,
  };
  return {
    prismaMock,
    studentFindManyMock,
    instructorFindManyMock,
    lessonFindManyMock,
    lessonCreateMock,
    transactionMock,
    userCreateMock,
    invitationCreateMock,
    resolveCategoryMock,
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

const demoGuardHoisted = vi.hoisted(() => ({
  decideDemoRouteMutationMock: vi.fn(),
}));

vi.mock("@/lib/demo/demo-route-guard", () => ({
  decideDemoRouteMutation: (...args: unknown[]) =>
    demoGuardHoisted.decideDemoRouteMutationMock(...args),
}));

vi.mock("@/lib/lessons/manual-practical-lesson-service", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/lessons/manual-practical-lesson-service")
  >("@/lib/lessons/manual-practical-lesson-service");
  return {
    ...actual,
    resolveDrivingCategoryIdForInstructor: (...args: unknown[]) =>
      h.resolveCategoryMock(...args),
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

const INSTRUCTOR_USER_ID = "11111111-1111-1111-1111-111111111111";
const INSTRUCTOR_RECORD_ID = "22222222-2222-2222-2222-222222222222";

const CSV_HEADER = PRACTICAL_LESSON_IMPORT_CSV_HEADERS.join(";");

function req(body: unknown): Request {
  return new Request(
    "http://school.example.com/api/admin/practical-lessons/import/apply",
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
  h.instructorFindManyMock.mockImplementation(async (args: unknown) => {
    const query = args as {
      where?: {
        user?: { email?: { in?: string[] } };
        userId?: { in?: string[] };
      };
    };
    if (query.where?.user?.email) {
      return [
        {
          userId: INSTRUCTOR_USER_ID,
          user: { email: "instrutor@school.test" },
        },
      ];
    }
    if (query.where?.userId) {
      return [{ id: INSTRUCTOR_RECORD_ID, userId: INSTRUCTOR_USER_ID }];
    }
    return [];
  });
  h.lessonFindManyMock.mockResolvedValue([]);
  h.lessonCreateMock.mockResolvedValue({ id: "lesson-new" });
  h.transactionMock.mockImplementation(async (callback: unknown) => {
    if (typeof callback === "function") {
      return callback(h.prismaMock);
    }
    return callback;
  });
  h.resolveCategoryMock.mockResolvedValue({ ok: true, categoryId: 2 });
  assertUserTenantHostMock.mockResolvedValue(null);
  demoGuardHoisted.decideDemoRouteMutationMock.mockResolvedValue({
    allowed: true,
  });
});

describe("POST /api/admin/practical-lessons/import/apply", () => {
  it("returns 403 for demo org before import apply and performs no writes", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-demo" },
    });
    demoGuardHoisted.decideDemoRouteMutationMock.mockResolvedValue({
      allowed: false,
      reason: "demo_restricted_action",
      status: 403,
      message: "This action is restricted in the public demo environment.",
    });

    const res = await POST(
      req({
        format: "csv",
        content: `${CSV_HEADER}\n26001;3;2026-05-29;09:00;60;instrutor@school.test;`,
      }) as any,
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("demo_restricted_action");
    expect(demoGuardHoisted.decideDemoRouteMutationMock).toHaveBeenCalledWith({
      organizationId: "org-demo",
      category: "lesson_management",
    });
    expect(h.studentFindManyMock).not.toHaveBeenCalled();
    expect(h.transactionMock).not.toHaveBeenCalled();
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
  });

  it("returns 401 for INSTRUCTOR", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "INSTRUCTOR", organizationId: "org-a" },
    });

    const res = await POST(req({ format: "json", rows: [] }) as any);
    expect(res.status).toBe(401);
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
  });

  it("returns 401 for STUDENT", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "STUDENT", organizationId: "org-a" },
    });

    const res = await POST(req({ format: "json", rows: [] }) as any);
    expect(res.status).toBe(401);
  });

  it("applies valid CSV for SUPER_ADMIN and creates lessons", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await POST(
      req({
        format: "csv",
        content: `${CSV_HEADER}\n26001;3;2026-05-29;09:00;60;instrutor@school.test;Nota importada`,
        mode: "createOnly",
      }) as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.applied).toBe(true);
    expect(body.data.createdCount).toBe(1);
    expect(body.data.report.validRows).toBe(1);
    expect(h.lessonCreateMock).toHaveBeenCalledTimes(1);

    const data = h.lessonCreateMock.mock.calls[0]?.[0]?.data;
    expect(data.organizationId).toBe("org-a");
    expect(data.lessonType).toBe(LESSON_TYPES.DRIVING);
    expect(data.status).toBe("COMPLETED");
    expect(data.lessonSource).toBe("IMPORT");
    expect(data.practicalLessonNumber).toBe(3);
    expect(data.adminNotes).toBe("Nota importada");
    expect(data.instructorId).toBe(INSTRUCTOR_RECORD_ID);
    expect(data.instructorId).not.toBe(INSTRUCTOR_USER_ID);
  });

  it("does not call lesson.create when a row is invalid", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await POST(
      req({
        format: "csv",
        content: `${CSV_HEADER}\n26001;1;2026-05-29;09:00;60;bad-email;`,
      }) as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.applied).toBe(false);
    expect(body.data.createdCount).toBe(0);
    expect(h.transactionMock).not.toHaveBeenCalled();
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
  });

  it("does not write when duplicate exists in database", async () => {
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

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.applied).toBe(false);
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
    expect(body.data.report.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "duplicate_practical_lesson_number" }),
      ]),
    );
  });

  it("scopes lookups to session organizationId", async () => {
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
  });

  it("returns 400 for invalid format", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    const res = await POST(req({ format: "xml", content: "x" }) as any);
    expect(res.status).toBe(400);
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
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
            practicalLessonNumber: 1,
            lessonDate: "2026-05-29",
            startTime: "09:00",
            instructorEmail: "instrutor@school.test",
          },
        ],
      }) as any,
    );
    expect(res.status).toBe(400);
  });

  it("does not create User, Student, or invitation records", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-a" },
    });

    await POST(
      req({
        format: "json",
        rows: [
          {
            schoolStudentId: "26001",
            practicalLessonNumber: 5,
            lessonDate: "2026-05-29",
            startTime: "09:00",
            instructorEmail: "instrutor@school.test",
          },
        ],
      }) as any,
    );

    expect(h.userCreateMock).not.toHaveBeenCalled();
    expect(h.invitationCreateMock).not.toHaveBeenCalled();
  });
});
