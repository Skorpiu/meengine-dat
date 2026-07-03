import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const studentFindFirstMock = vi.fn();
  const instructorFindFirstMock = vi.fn();
  const lessonFindFirstMock = vi.fn();
  const lessonFindManyMock = vi.fn();
  const lessonCreateMock = vi.fn();
  const categoryFindFirstMock = vi.fn();
  const createManualMock = vi.fn();
  const listManualMock = vi.fn();
  const writeLessonCreateAuditEventMock = vi.fn();

  return {
    studentFindFirstMock,
    instructorFindFirstMock,
    lessonFindFirstMock,
    lessonFindManyMock,
    lessonCreateMock,
    categoryFindFirstMock,
    createManualMock,
    listManualMock,
    writeLessonCreateAuditEventMock,
    prismaMock: {
      student: { findFirst: studentFindFirstMock },
      instructor: { findFirst: instructorFindFirstMock },
      lesson: {
        findFirst: lessonFindFirstMock,
        findMany: lessonFindManyMock,
        create: lessonCreateMock,
      },
      category: { findFirst: categoryFindFirstMock },
    },
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

vi.mock("@/lib/demo/demo-write-sandbox-route-guard", () => ({
  decideDemoLessonCreate: vi.fn(),
}));

vi.mock("@/lib/lessons/manual-practical-lesson-service", () => ({
  createManualPracticalLesson: (...args: unknown[]) =>
    h.createManualMock(...args),
  listStudentPracticalLessons: (...args: unknown[]) =>
    h.listManualMock(...args),
}));

vi.mock("@/lib/audit/lesson-audit", () => ({
  MANUAL_PRACTICAL_LESSON_CREATE_VIA: "manual_practical_lesson",
  writeLessonCreateAuditEvent: (...args: unknown[]) =>
    h.writeLessonCreateAuditEventMock(...args),
}));

import { GET, POST } from "./route";
import { getServerSession } from "next-auth";
import { assertUserTenantHost } from "@/lib/users/user-route-access";
import { decideDemoLessonCreate } from "@/lib/demo/demo-write-sandbox-route-guard";

const getServerSessionMock = getServerSession as unknown as ReturnType<
  typeof vi.fn
>;
const assertUserTenantHostMock = assertUserTenantHost as unknown as ReturnType<
  typeof vi.fn
>;
const decideDemoMock = decideDemoLessonCreate as unknown as ReturnType<
  typeof vi.fn
>;

const studentId = "stu-manual-1";

function req(method: string, payload?: unknown): Request {
  return new Request(
    `http://school.example.com/api/admin/students/${studentId}/practical-lessons`,
    {
      method,
      headers: { "content-type": "application/json" },
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
    },
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  getServerSessionMock.mockResolvedValue({
    user: { id: "admin-1", role: "SUPER_ADMIN", organizationId: "org-1" },
  });
  assertUserTenantHostMock.mockResolvedValue(null);
  decideDemoMock.mockResolvedValue({ allowed: true });
  h.studentFindFirstMock.mockResolvedValue({ id: studentId });
  h.listManualMock.mockResolvedValue([
    {
      id: "lesson-1",
      lessonDate: new Date("2026-01-05"),
      startTime: "09:00",
      endTime: "10:00",
      practicalLessonNumber: 1,
      status: "COMPLETED",
      lessonSource: "MANUAL",
      instructorName: "Ana Costa",
    },
  ]);
  h.createManualMock.mockResolvedValue({
    ok: true,
    lesson: {
      id: "lesson-new",
      lessonDate: new Date("2026-01-10"),
      startTime: "10:00",
      endTime: "11:00",
      practicalLessonNumber: 5,
      status: "COMPLETED",
      lessonSource: "MANUAL",
      instructorName: "João Silva",
    },
    auditSnapshot: {
      id: "lesson-new",
      lessonType: "DRIVING",
      studentId,
      instructorId: "inst-db-1",
      vehicleId: null,
      lessonSource: "MANUAL",
      practicalLessonNumber: 5,
      lessonDate: new Date("2026-01-10T00:00:00.000Z"),
    },
  });
  h.writeLessonCreateAuditEventMock.mockResolvedValue({
    ok: true,
    id: "audit-1",
  });
});

describe("GET /api/admin/students/[id]/practical-lessons", () => {
  it("returns practical lesson history for SUPER_ADMIN", async () => {
    const res = await GET(req("GET") as any, { params: { id: studentId } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.lessons).toHaveLength(1);
    expect(h.listManualMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      studentId,
    });
  });

  it("returns 404 when student is missing in org", async () => {
    h.studentFindFirstMock.mockResolvedValueOnce(null);
    const res = await GET(req("GET") as any, { params: { id: studentId } });
    expect(res.status).toBe(404);
    expect(h.listManualMock).not.toHaveBeenCalled();
  });

  it("blocks INSTRUCTOR", async () => {
    getServerSessionMock.mockResolvedValueOnce({
      user: { id: "inst-1", role: "INSTRUCTOR", organizationId: "org-1" },
    });
    const res = await GET(req("GET") as any, { params: { id: studentId } });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/admin/students/[id]/practical-lessons", () => {
  const payload = {
    lessonDate: "2026-01-10",
    startTime: "10:00",
    instructorId: "11111111-1111-1111-1111-111111111111",
    practicalLessonNumber: 5,
    durationMinutes: 60,
  };

  it("creates manual practical lesson (201)", async () => {
    const res = await POST(req("POST", payload) as any, {
      params: { id: studentId },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.lesson.practicalLessonNumber).toBe(5);
    expect(h.createManualMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      studentId,
      body: expect.objectContaining({ practicalLessonNumber: 5 }),
    });
    expect(h.writeLessonCreateAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        actor: {
          userId: "admin-1",
          role: "SUPER_ADMIN",
          email: undefined,
        },
        lesson: {
          id: "lesson-new",
          lessonType: "DRIVING",
          studentId,
          instructorId: "inst-db-1",
          vehicleId: null,
          lessonSource: "MANUAL",
          practicalLessonNumber: 5,
        },
        metadataExtras: {
          createdVia: "manual_practical_lesson",
          lessonDate: new Date("2026-01-10T00:00:00.000Z"),
        },
      }),
    );

    const auditPayload = JSON.stringify(
      h.writeLessonCreateAuditEventMock.mock.calls[0]?.[0],
    );
    expect(auditPayload).not.toContain("João Silva");
    expect(auditPayload).not.toContain("notes");
  });

  it("POST still returns 201 when audit write fails", async () => {
    h.writeLessonCreateAuditEventMock.mockResolvedValueOnce({
      ok: false,
      error: "db_down",
    });

    const res = await POST(req("POST", payload) as any, {
      params: { id: studentId },
    });

    expect(res.status).toBe(201);
    expect(h.createManualMock).toHaveBeenCalled();
    expect(h.writeLessonCreateAuditEventMock).toHaveBeenCalled();
  });

  it("returns 409 when service reports duplicate number", async () => {
    h.createManualMock.mockResolvedValueOnce({
      ok: false,
      error: "practical_lesson_number_already_exists",
      code: "practical_lesson_number_already_exists",
      status: 409,
    });

    const res = await POST(req("POST", payload) as any, {
      params: { id: studentId },
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("practical_lesson_number_already_exists");
    expect(h.writeLessonCreateAuditEventMock).not.toHaveBeenCalled();
  });

  it("does not emit audit when validation fails", async () => {
    const res = await POST(
      req("POST", { ...payload, practicalLessonNumber: -1 }) as any,
      { params: { id: studentId } },
    );
    expect(res.status).toBe(400);
    expect(h.createManualMock).not.toHaveBeenCalled();
    expect(h.writeLessonCreateAuditEventMock).not.toHaveBeenCalled();
  });

  it("does not call create when demo sandbox blocks lesson create", async () => {
    decideDemoMock.mockResolvedValueOnce({
      allowed: false,
      message: "Demo restricted",
      code: "demo_restricted_action",
      status: 403,
    });

    const res = await POST(req("POST", payload) as any, {
      params: { id: studentId },
    });
    expect(res.status).toBe(403);
    expect(h.createManualMock).not.toHaveBeenCalled();
    expect(h.writeLessonCreateAuditEventMock).not.toHaveBeenCalled();
  });
});
