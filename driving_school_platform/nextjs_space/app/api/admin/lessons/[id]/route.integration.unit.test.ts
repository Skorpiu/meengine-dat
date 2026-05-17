import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const lessonFindFirstMock = vi.fn();
  const lessonUpdateMock = vi.fn();
  const lessonDeleteManyMock = vi.fn();
  const organizationFindUniqueMock = vi.fn();
  const vehicleFindFirstMock = vi.fn();

  const prismaMock = {
    lesson: {
      findFirst: lessonFindFirstMock,
      update: lessonUpdateMock,
      deleteMany: lessonDeleteManyMock,
    },
    organization: { findUnique: organizationFindUniqueMock },
    vehicle: { findFirst: vehicleFindFirstMock },
  };

  return {
    prismaMock,
    lessonFindFirstMock,
    lessonUpdateMock,
    lessonDeleteManyMock,
    organizationFindUniqueMock,
    vehicleFindFirstMock,
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
const LESSON_ID = "lesson-abc";

function futureLessonRow(overrides: Record<string, unknown> = {}) {
  return {
    id: LESSON_ID,
    lessonDate: new Date("2030-06-01T00:00:00.000Z"),
    endTime: "23:59",
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
  });
});
