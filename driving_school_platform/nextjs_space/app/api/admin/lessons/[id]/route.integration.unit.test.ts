import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const lessonFindFirstMock = vi.fn();
  const lessonUpdateMock = vi.fn();
  const lessonDeleteManyMock = vi.fn();
  const organizationFindUniqueMock = vi.fn();
  const vehicleFindFirstMock = vi.fn();
  const instructorFindFirstMock = vi.fn();
  const studentFindFirstMock = vi.fn();
  const writeLessonUpdateAuditEventMock = vi.fn();
  const writeLessonDeleteAuditEventMock = vi.fn();

  const prismaMock = {
    lesson: {
      findFirst: lessonFindFirstMock,
      update: lessonUpdateMock,
      deleteMany: lessonDeleteManyMock,
    },
    organization: { findUnique: organizationFindUniqueMock },
    vehicle: { findFirst: vehicleFindFirstMock },
    instructor: { findFirst: instructorFindFirstMock },
    student: { findFirst: studentFindFirstMock },
  };

  return {
    prismaMock,
    lessonFindFirstMock,
    lessonUpdateMock,
    lessonDeleteManyMock,
    organizationFindUniqueMock,
    vehicleFindFirstMock,
    instructorFindFirstMock,
    studentFindFirstMock,
    writeLessonUpdateAuditEventMock,
    writeLessonDeleteAuditEventMock,
  };
});

vi.mock("@/lib/audit/lesson-audit", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/audit/lesson-audit")
  >("@/lib/audit/lesson-audit");
  return {
    ...actual,
    writeLessonUpdateAuditEvent: h.writeLessonUpdateAuditEventMock,
    writeLessonDeleteAuditEvent: h.writeLessonDeleteAuditEventMock,
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
  db: h.prismaMock,
}));

vi.mock("@/lib/tenant", () => ({
  guardTenantAuthenticatedRoute: vi.fn(),
}));

vi.mock("@/lib/middleware/feature-check", () => ({
  checkFeatureAccess: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/lib/api-utils", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils");
  return {
    ...actual,
    verifyAuth: vi.fn(),
  };
});

import { GET, PUT, DELETE } from "./route";
import { verifyAuth } from "@/lib/api-utils";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";
import { expectLessonSelectSanitizesNestedUsers } from "@/lib/lessons/lesson-include-safety";
import { sampleLessonDetailFixture } from "@/lib/lessons/lesson-response-contract-fixtures";
import {
  expectAdminLessonDetailResponseContract,
  expectAdminLessonPutResponseContract,
} from "@/lib/lessons/lesson-response-contract";
import { LESSON_DETAIL_SELECT } from "@/lib/lessons/lesson-queries";

const verifyAuthMock = verifyAuth as unknown as ReturnType<typeof vi.fn>;
const guardTenantMock = guardTenantAuthenticatedRoute as unknown as ReturnType<
  typeof vi.fn
>;

const UUID_A = "11111111-1111-1111-1111-111111111111";
const UUID_B = "22222222-2222-2222-2222-222222222222";
const UUID_C = "33333333-3333-3333-3333-333333333333";
const INSTRUCTOR_ROW_ID = "instructor-row-1";
const STUDENT_ROW_ID = "student-row-1";
const LESSON_ID = "lesson-abc";

function futureLessonRow(overrides: Record<string, unknown> = {}) {
  return {
    id: LESSON_ID,
    lessonDate: new Date("2030-06-01T00:00:00.000Z"),
    endTime: "23:59",
    studentId: STUDENT_ROW_ID,
    instructorId: INSTRUCTOR_ROW_ID,
    vehicleId: 7,
    lessonType: "DRIVING",
    lessonSource: "SYSTEM",
    practicalLessonNumber: 3,
    instructor: { userId: UUID_A },
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  guardTenantMock.mockResolvedValue({ allowed: true });
  h.organizationFindUniqueMock.mockResolvedValue({ isDemo: false });
  verifyAuthMock.mockResolvedValue({
    id: UUID_A,
    role: "SUPER_ADMIN",
    organizationId: "org1",
  });
  h.lessonFindFirstMock.mockResolvedValue(futureLessonRow());
  h.lessonUpdateMock.mockResolvedValue({ id: LESSON_ID, status: "SCHEDULED" });
  h.lessonDeleteManyMock.mockResolvedValue({ count: 1 });
  h.instructorFindFirstMock.mockResolvedValue({
    id: INSTRUCTOR_ROW_ID,
    isAvailableForBooking: true,
  });
  h.studentFindFirstMock.mockResolvedValue({ id: STUDENT_ROW_ID });
  h.writeLessonUpdateAuditEventMock.mockResolvedValue({
    ok: true,
    id: "audit-1",
  });
  h.writeLessonDeleteAuditEventMock.mockResolvedValue({
    ok: true,
    id: "audit-del-1",
  });
});

describe("GET /api/admin/lessons/[id]", () => {
  it("uses LESSON_DETAIL_SELECT and returns edit-form fields without passwordHash", async () => {
    h.lessonFindFirstMock.mockResolvedValue(
      sampleLessonDetailFixture({
        id: LESSON_ID,
        lessonDate: new Date("2030-06-01T00:00:00.000Z"),
        endTime: "23:59",
        instructor: {
          id: "instructor-row-1",
          userId: UUID_A,
          user: { id: UUID_A, firstName: "Ian", lastName: "Instructor" },
        },
      }),
    );

    const res = await GET(
      new Request(`http://localhost/api/admin/lessons/${LESSON_ID}`) as any,
      { params: { id: LESSON_ID } } as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expectAdminLessonDetailResponseContract(body);
    expect(h.lessonFindFirstMock.mock.calls[0]?.[0]?.select).toEqual(
      LESSON_DETAIL_SELECT,
    );
    expectLessonSelectSanitizesNestedUsers(
      h.lessonFindFirstMock.mock.calls[0]?.[0]?.select,
    );
    expect(body.data.instructor.user.firstName).toBe("Ian");
    expect(body.data.vehicleId).toBe(7);
    expect(body.data.vehicle.registrationNumber).toBe("AB-12-CD");
    expect(body.data).not.toHaveProperty("lessonPrice");
  });
});

describe("PUT /api/admin/lessons/[id]", () => {
  it("updates a lesson on happy path", async () => {
    h.lessonUpdateMock.mockResolvedValue(
      sampleLessonDetailFixture({
        id: LESSON_ID,
        startTime: "10:00",
        endTime: "11:00",
        status: "SCHEDULED",
      }),
    );

    const res = await PUT(
      new Request(`http://localhost/api/admin/lessons/${LESSON_ID}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          startTime: "10:00",
          endTime: "11:00",
          status: "SCHEDULED",
        }),
      }) as any,
      { params: { id: LESSON_ID } } as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expectAdminLessonPutResponseContract(body);
    expect(h.lessonUpdateMock).toHaveBeenCalled();
    expect(h.lessonUpdateMock.mock.calls[0]?.[0]?.select).toEqual(
      LESSON_DETAIL_SELECT,
    );
    expectLessonSelectSanitizesNestedUsers(
      h.lessonUpdateMock.mock.calls[0]?.[0]?.select,
    );
    expect(body.data.lesson.startTime).toBe("10:00");
    expect(h.writeLessonUpdateAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org1",
        actor: {
          userId: UUID_A,
          role: "SUPER_ADMIN",
          email: undefined,
        },
        changedFields: ["startTime", "endTime", "status"],
        lesson: expect.objectContaining({
          id: LESSON_ID,
        }),
      }),
    );
  });

  it("updates instructorId and studentId for admin", async () => {
    h.lessonUpdateMock.mockResolvedValue(
      sampleLessonDetailFixture({
        id: LESSON_ID,
        instructorId: INSTRUCTOR_ROW_ID,
        studentId: STUDENT_ROW_ID,
        instructor: {
          id: INSTRUCTOR_ROW_ID,
          userId: UUID_C,
          user: { id: UUID_C, firstName: "New", lastName: "Instructor" },
        },
        student: {
          id: STUDENT_ROW_ID,
          userId: UUID_B,
          firstName: "New",
          lastName: "Student",
          schoolStudentId: "26002",
          user: { id: UUID_B, firstName: "New", lastName: "Student" },
        },
      }),
    );

    const res = await PUT(
      new Request(`http://localhost/api/admin/lessons/${LESSON_ID}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          startTime: "10:00",
          endTime: "11:00",
          instructorId: UUID_C,
          studentId: STUDENT_ROW_ID,
        }),
      }) as any,
      { params: { id: LESSON_ID } } as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expectAdminLessonPutResponseContract(body);
    expect(h.instructorFindFirstMock).toHaveBeenCalledWith({
      where: { userId: UUID_C, organizationId: "org1" },
      select: { id: true, isAvailableForBooking: true },
    });
    expect(h.lessonUpdateMock.mock.calls[0]?.[0]?.data).toEqual(
      expect.objectContaining({
        instructorId: INSTRUCTOR_ROW_ID,
        studentId: STUDENT_ROW_ID,
      }),
    );
    expect(body.data.lesson.instructor.user.firstName).toBe("New");
    expect(body.data.lesson.student.firstName).toBe("New");
  });

  it("returns 404 when instructor is not in organization", async () => {
    h.instructorFindFirstMock.mockResolvedValue(null);

    const res = await PUT(
      new Request(`http://localhost/api/admin/lessons/${LESSON_ID}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instructorId: UUID_C }),
      }) as any,
      { params: { id: LESSON_ID } } as any,
    );

    expect(res.status).toBe(404);
    expect(h.lessonUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 404 when student is not in organization", async () => {
    h.studentFindFirstMock.mockResolvedValue(null);

    const res = await PUT(
      new Request(`http://localhost/api/admin/lessons/${LESSON_ID}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentId: STUDENT_ROW_ID }),
      }) as any,
      { params: { id: LESSON_ID } } as any,
    );

    expect(res.status).toBe(404);
    expect(h.lessonUpdateMock).not.toHaveBeenCalled();
  });

  it("forbids instructor role from assigning another instructor", async () => {
    verifyAuthMock.mockResolvedValue({
      id: UUID_A,
      role: "INSTRUCTOR",
      organizationId: "org1",
    });

    const res = await PUT(
      new Request(`http://localhost/api/admin/lessons/${LESSON_ID}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instructorId: UUID_C }),
      }) as any,
      { params: { id: LESSON_ID } } as any,
    );

    expect(res.status).toBe(403);
    expect(h.lessonUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 404 when lesson not found", async () => {
    h.lessonFindFirstMock.mockResolvedValue(null);

    const res = await PUT(
      new Request(`http://localhost/api/admin/lessons/${LESSON_ID}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "SCHEDULED" }),
      }) as any,
      { params: { id: LESSON_ID } } as any,
    );

    expect(res.status).toBe(404);
    expect(h.lessonUpdateMock).not.toHaveBeenCalled();
    expect(h.writeLessonUpdateAuditEventMock).not.toHaveBeenCalled();
  });

  it("PUT still returns 200 when audit write fails", async () => {
    h.writeLessonUpdateAuditEventMock.mockResolvedValue({
      ok: false,
      error: "db_down",
    });
    h.lessonUpdateMock.mockResolvedValue(
      sampleLessonDetailFixture({
        id: LESSON_ID,
        startTime: "10:00",
        endTime: "11:00",
        status: "SCHEDULED",
      }),
    );

    const res = await PUT(
      new Request(`http://localhost/api/admin/lessons/${LESSON_ID}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          startTime: "10:00",
          endTime: "11:00",
          status: "SCHEDULED",
        }),
      }) as any,
      { params: { id: LESSON_ID } } as any,
    );

    expect(res.status).toBe(200);
    expect(h.writeLessonUpdateAuditEventMock).toHaveBeenCalled();
    expect(h.lessonUpdateMock).toHaveBeenCalled();
  });

  it("demo org blocks PUT with demo_restricted_action", async () => {
    verifyAuthMock.mockResolvedValue({
      id: UUID_A,
      role: "SUPER_ADMIN",
      organizationId: "org-demo",
    });
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });

    const res = await PUT(
      new Request(`http://localhost/api/admin/lessons/${LESSON_ID}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "SCHEDULED" }),
      }) as any,
      { params: { id: LESSON_ID } } as any,
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("demo_restricted_action");
    expect(h.lessonUpdateMock).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/lessons/[id]", () => {
  it("deletes a lesson on happy path", async () => {
    const res = await DELETE(
      new Request(`http://localhost/api/admin/lessons/${LESSON_ID}`, {
        method: "DELETE",
      }) as any,
      { params: { id: LESSON_ID } } as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.message).toBe("Lesson deleted successfully");
    expect(h.lessonDeleteManyMock).toHaveBeenCalledWith({
      where: { id: LESSON_ID, organizationId: "org1" },
    });
    expect(h.writeLessonDeleteAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org1",
        actor: {
          userId: UUID_A,
          role: "SUPER_ADMIN",
          email: undefined,
        },
        lesson: expect.objectContaining({
          id: LESSON_ID,
          lessonType: "DRIVING",
          studentId: STUDENT_ROW_ID,
          instructorId: INSTRUCTOR_ROW_ID,
          vehicleId: 7,
          lessonSource: "SYSTEM",
        }),
      }),
    );

    const auditPayload = JSON.stringify(
      h.writeLessonDeleteAuditEventMock.mock.calls[0]?.[0]?.lesson,
    );
    expect(auditPayload).not.toContain("password");
    expect(auditPayload).not.toContain("notes");
    expect(auditPayload).not.toContain("@");
  });

  it("returns 404 when lesson not found", async () => {
    h.lessonFindFirstMock.mockResolvedValue(null);

    const res = await DELETE(
      new Request(`http://localhost/api/admin/lessons/${LESSON_ID}`, {
        method: "DELETE",
      }) as any,
      { params: { id: LESSON_ID } } as any,
    );

    expect(res.status).toBe(404);
    expect(h.lessonDeleteManyMock).not.toHaveBeenCalled();
    expect(h.writeLessonDeleteAuditEventMock).not.toHaveBeenCalled();
  });

  it("returns 400 when lesson already ended without audit", async () => {
    h.lessonFindFirstMock.mockResolvedValue({
      id: LESSON_ID,
      lessonDate: new Date("2020-01-01"),
      endTime: "08:00",
      instructor: { userId: UUID_A },
    });

    const res = await DELETE(
      new Request(`http://localhost/api/admin/lessons/${LESSON_ID}`, {
        method: "DELETE",
      }) as any,
      { params: { id: LESSON_ID } } as any,
    );

    expect(res.status).toBe(400);
    expect(h.lessonDeleteManyMock).not.toHaveBeenCalled();
    expect(h.writeLessonDeleteAuditEventMock).not.toHaveBeenCalled();
  });

  it("forbids instructor from deleting another instructor lesson without audit", async () => {
    verifyAuthMock.mockResolvedValue({
      id: UUID_B,
      role: "INSTRUCTOR",
      organizationId: "org1",
    });
    h.lessonFindFirstMock.mockResolvedValue(
      futureLessonRow({ instructor: { userId: UUID_A } }),
    );

    const res = await DELETE(
      new Request(`http://localhost/api/admin/lessons/${LESSON_ID}`, {
        method: "DELETE",
      }) as any,
      { params: { id: LESSON_ID } } as any,
    );

    expect(res.status).toBe(403);
    expect(h.lessonDeleteManyMock).not.toHaveBeenCalled();
    expect(h.writeLessonDeleteAuditEventMock).not.toHaveBeenCalled();
  });

  it("DELETE still returns 200 when audit write fails", async () => {
    h.writeLessonDeleteAuditEventMock.mockResolvedValue({
      ok: false,
      error: "db_down",
    });

    const res = await DELETE(
      new Request(`http://localhost/api/admin/lessons/${LESSON_ID}`, {
        method: "DELETE",
      }) as any,
      { params: { id: LESSON_ID } } as any,
    );

    expect(res.status).toBe(200);
    expect(h.writeLessonDeleteAuditEventMock).toHaveBeenCalled();
    expect(h.lessonDeleteManyMock).toHaveBeenCalled();
  });

  it("demo org blocks DELETE with demo_restricted_action", async () => {
    verifyAuthMock.mockResolvedValue({
      id: UUID_A,
      role: "SUPER_ADMIN",
      organizationId: "org-demo",
    });
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });

    const res = await DELETE(
      new Request(`http://localhost/api/admin/lessons/${LESSON_ID}`, {
        method: "DELETE",
      }) as any,
      { params: { id: LESSON_ID } } as any,
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("demo_restricted_action");
    expect(h.lessonDeleteManyMock).not.toHaveBeenCalled();
    expect(h.writeLessonDeleteAuditEventMock).not.toHaveBeenCalled();
  });
});
