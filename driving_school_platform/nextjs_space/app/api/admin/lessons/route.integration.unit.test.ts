import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// -----------------------------
// Hoisted mocks (Vitest-safe)
// -----------------------------
const h = vi.hoisted(() => {
  const instructorFindFirstMock = vi.fn();
  const categoryFindFirstMock = vi.fn();
  const studentFindFirstMock = vi.fn();
  const lessonCreateMock = vi.fn();
  const lessonCountMock = vi.fn();
  const lessonFindManyMock = vi.fn();
  const lessonDeleteManyMock = vi.fn();
  const organizationFindUniqueMock = vi.fn();
  const vehicleFindFirstMock = vi.fn();

  const prismaMock = {
    instructor: { findFirst: instructorFindFirstMock },
    category: { findFirst: categoryFindFirstMock },
    student: { findFirst: studentFindFirstMock },
    vehicle: { findFirst: vehicleFindFirstMock },
    lesson: {
      create: lessonCreateMock,
      count: lessonCountMock,
      findMany: lessonFindManyMock,
      deleteMany: lessonDeleteManyMock,
    },
    organization: { findUnique: organizationFindUniqueMock },
  };

  return {
    prismaMock,
    instructorFindFirstMock,
    categoryFindFirstMock,
    studentFindFirstMock,
    lessonCreateMock,
    lessonCountMock,
    lessonFindManyMock,
    lessonDeleteManyMock,
    organizationFindUniqueMock,
    vehicleFindFirstMock,
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
  db: h.prismaMock,
}));

vi.mock("@/lib/middleware/feature-check", () => ({
  checkFeatureAccess: vi.fn(),
}));

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<any>("@/lib/api-utils");
  return {
    ...actual,
    verifyAuth: vi.fn(),
  };
});

// IMPORTANT: import AFTER mocks
import { POST, GET } from "./route";
import { verifyAuth } from "@/lib/api-utils";
import { checkFeatureAccess } from "@/lib/middleware/feature-check";
import { expectLessonIncludeSanitizesNestedUsers } from "@/lib/lessons/lesson-include-safety";
import { sampleLessonListItemFixture } from "@/lib/lessons/lesson-response-contract-fixtures";
import {
  expectAdminDashboardLessonsResponseContract,
  expectLessonCalendarResponseContract,
} from "@/lib/lessons/lesson-response-contract";

const verifyAuthMock = verifyAuth as unknown as ReturnType<typeof vi.fn>;
const checkFeatureAccessMock = checkFeatureAccess as unknown as ReturnType<
  typeof vi.fn
>;

function reqJson(payload: any): Request {
  return new Request("http://localhost/api/admin/lessons", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function reqGet(url: string): Request {
  return new Request(url, { method: "GET" });
}

const UUID_A = "11111111-1111-1111-1111-111111111111";
const UUID_B = "22222222-2222-2222-2222-222222222222";
const UUID_C = "33333333-3333-3333-3333-333333333333";
const UUID_D = "44444444-4444-4444-4444-444444444444";

beforeEach(() => {
  vi.resetAllMocks();
  delete process.env.DEMO_WRITE_SANDBOX_ENABLED;

  h.organizationFindUniqueMock.mockResolvedValue({ isDemo: false });
  h.lessonCountMock.mockResolvedValue(0);

  h.instructorFindFirstMock.mockResolvedValue({
    id: "inst-db-1",
    qualifiedCategories: [{ id: 1 }],
  });

  h.categoryFindFirstMock.mockResolvedValue({ id: 1, name: "B" });

  h.studentFindFirstMock.mockImplementation(async ({ where }: any) => {
    if (!where?.userId) return null;
    return {
      id: `student-db-${where.userId.slice(0, 8)}`,
      userId: where.userId,
    };
  });

  h.lessonCreateMock.mockImplementation(async ({ data }: any) => {
    return { id: `lesson-${Math.random().toString(16).slice(2)}`, ...data };
  });

  h.lessonFindManyMock.mockResolvedValue([]);
  h.vehicleFindFirstMock.mockResolvedValue({ id: 7 });
});

afterEach(() => {
  delete process.env.DEMO_WRITE_SANDBOX_ENABLED;
});

describe("GET /api/admin/lessons (read-only)", () => {
  it("does not call lesson.deleteMany and loads dashboard slices via findMany", async () => {
    verifyAuthMock.mockResolvedValue({
      id: UUID_A,
      role: "SUPER_ADMIN",
      organizationId: "org1",
    });

    const res = await GET(
      reqGet("http://localhost/api/admin/lessons?view=DRIVING") as any,
    );

    expect(res.status).toBe(200);
    expect(h.lessonDeleteManyMock).not.toHaveBeenCalled();
    expect(h.lessonFindManyMock).toHaveBeenCalled();
    expect(h.lessonFindManyMock.mock.calls.length).toBe(3);

    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body).not.toHaveProperty("lessons");
    expect(Object.keys(body.data).sort()).toEqual([
      "current",
      "recent",
      "upcoming",
    ]);
    expect(body.data).toMatchObject({
      recent: [],
      current: [],
      upcoming: [],
    });
    for (const call of h.lessonFindManyMock.mock.calls) {
      expectLessonIncludeSanitizesNestedUsers(call[0]?.include);
    }
  });

  it("calendar from/to uses findMany once, returns lessons, and does not delete", async () => {
    verifyAuthMock.mockResolvedValue({
      id: UUID_A,
      role: "SUPER_ADMIN",
      organizationId: "org1",
    });
    h.lessonFindManyMock.mockResolvedValueOnce([{ id: "cal-1" }]);

    const res = await GET(
      reqGet(
        "http://localhost/api/admin/lessons?from=2026-01-01&to=2026-01-08",
      ) as any,
    );

    expect(res.status).toBe(200);
    expect(h.lessonDeleteManyMock).not.toHaveBeenCalled();
    expect(h.lessonFindManyMock).toHaveBeenCalledTimes(1);
    const body: any = await res.json();
    expect(body.lessons).toEqual([{ id: "cal-1" }]);
    expect(body).not.toHaveProperty("success");
    const findManyArg = h.lessonFindManyMock.mock.calls[0]?.[0];
    expectLessonIncludeSanitizesNestedUsers(findManyArg?.include);
  });

  it("calendar invalid from returns 400 invalid_calendar_range", async () => {
    verifyAuthMock.mockResolvedValue({
      id: UUID_A,
      role: "SUPER_ADMIN",
      organizationId: "org1",
    });

    const res = await GET(
      reqGet(
        "http://localhost/api/admin/lessons?from=not-a-date&to=2026-01-08",
      ) as any,
    );

    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.code).toBe("invalid_calendar_range");
    expect(body.error).toBe("Invalid lesson calendar date range.");
    expect(h.lessonFindManyMock).not.toHaveBeenCalled();
  });

  it("calendar to <= from returns 400 invalid_calendar_range", async () => {
    verifyAuthMock.mockResolvedValue({
      id: UUID_A,
      role: "SUPER_ADMIN",
      organizationId: "org1",
    });

    const res = await GET(
      reqGet(
        "http://localhost/api/admin/lessons?from=2026-01-20&to=2026-01-10",
      ) as any,
    );

    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.code).toBe("invalid_calendar_range");
    expect(h.lessonFindManyMock).not.toHaveBeenCalled();
  });

  it("calendar DTO contract: lessons array with UI fields and no nested passwordHash", async () => {
    verifyAuthMock.mockResolvedValue({
      id: UUID_A,
      role: "SUPER_ADMIN",
      organizationId: "org1",
    });
    const fixture = sampleLessonListItemFixture();
    h.lessonFindManyMock.mockResolvedValueOnce([fixture]);

    const res = await GET(
      reqGet(
        "http://localhost/api/admin/lessons?from=2026-01-01&to=2026-01-08",
      ) as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expectLessonCalendarResponseContract(body);
    expect(body.lessons[0].pickupLocation).toBe("Main garage");
    expect(body.lessons[0].student.user.firstName).toBe("Sam");
    expect(body.lessons[0].vehicle.registrationNumber).toBe("AB-12-CD");
    expect(body.lessons[0].category.name).toBe("B");
  });

  it("dashboard DTO contract: success envelope slices with UI fields and no nested passwordHash", async () => {
    verifyAuthMock.mockResolvedValue({
      id: UUID_A,
      role: "SUPER_ADMIN",
      organizationId: "org1",
    });
    const fixture = sampleLessonListItemFixture({ id: "lesson-dash-1" });
    h.lessonFindManyMock
      .mockResolvedValueOnce([fixture])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await GET(
      reqGet("http://localhost/api/admin/lessons?view=DRIVING") as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expectAdminDashboardLessonsResponseContract(body);
    expect(body.data.recent[0].instructor.user.lastName).toBe("Instructor");
  });

  it("calendar range over 90 days returns 400 calendar_range_too_large", async () => {
    verifyAuthMock.mockResolvedValue({
      id: UUID_A,
      role: "SUPER_ADMIN",
      organizationId: "org1",
    });

    const res = await GET(
      reqGet(
        "http://localhost/api/admin/lessons?from=2026-01-01&to=2026-05-01",
      ) as any,
    );

    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.code).toBe("calendar_range_too_large");
    expect(body.error).toBe(
      "Lesson calendar date range cannot exceed 90 days.",
    );
    expect(h.lessonFindManyMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/lessons (handler integration)", () => {
  it("blocks vehicleId when vehicles feature is disabled (403) and does not touch DB", async () => {
    verifyAuthMock.mockResolvedValue({
      id: UUID_A,
      role: "SUPER_ADMIN",
      organizationId: "org1",
    });
    checkFeatureAccessMock.mockResolvedValue({
      allowed: false,
      error: "Feature not enabled",
    });

    const payload = {
      lessonType: "DRIVING",
      instructorId: UUID_A,
      studentId: UUID_B,
      lessonDate: "2026-01-06",
      startTime: "10:00",
      endTime: "11:00",
      vehicleId: 1,
    };

    const res = await POST(reqJson(payload) as any);

    expect(res.status).toBe(403);
    const body: any = await res.json();

    expect(body.requiresUpgrade).toBe(true);
    expect(body.error).toBe("Vehicles feature not enabled");

    expect(h.instructorFindFirstMock).not.toHaveBeenCalled();
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
  });

  it("creates THEORY_EXAM for multiple students (201) and does not call feature check when vehicleId absent", async () => {
    verifyAuthMock.mockResolvedValue({
      id: UUID_A,
      role: "SUPER_ADMIN",
      organizationId: "org1",
    });

    const payload = {
      lessonType: "THEORY_EXAM",
      instructorId: UUID_A,
      studentIds: [UUID_B, UUID_C],
      lessonDate: "2026-01-06",
      startTime: "10:00",
      endTime: "11:00",
    };

    const res = await POST(reqJson(payload) as any);

    expect(res.status).toBe(201);
    const body: any = await res.json();

    expect(body.success).toBe(true);
    expect(body.data?.lessons?.length).toBe(2);

    expect(h.studentFindFirstMock).toHaveBeenCalledTimes(2);
    expect(h.lessonCreateMock).toHaveBeenCalledTimes(2);

    expect(checkFeatureAccessMock).not.toHaveBeenCalled();
  });

  it("returns 400 when DRIVING is missing studentId (validation)", async () => {
    verifyAuthMock.mockResolvedValue({
      id: UUID_A,
      role: "SUPER_ADMIN",
      organizationId: "org1",
    });

    const payload = {
      lessonType: "DRIVING",
      instructorId: UUID_A,
      lessonDate: "2026-01-06",
      startTime: "10:00",
      endTime: "11:00",
    };

    const res = await POST(reqJson(payload) as any);

    expect(res.status).toBe(400);
    const body: any = await res.json();

    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeTruthy();

    expect(h.instructorFindFirstMock).not.toHaveBeenCalled();
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
  });

  it("forces instructorId to the logged-in instructor when role=INSTRUCTOR", async () => {
    const instructorUserId = UUID_D;

    verifyAuthMock.mockResolvedValue({
      id: instructorUserId,
      role: "INSTRUCTOR",
      organizationId: "org1",
    });

    const payload = {
      lessonType: "THEORY",
      instructorId: UUID_A,
      lessonDate: "2026-01-06",
      startTime: "10:00",
      endTime: "11:00",
    };

    await POST(reqJson(payload) as any);

    expect(h.instructorFindFirstMock).toHaveBeenCalledTimes(1);
    const callArg = h.instructorFindFirstMock.mock.calls[0]?.[0];
    expect(callArg?.where?.userId).toBe(instructorUserId);
  });

  it("creates EXAM with vehicleId as positive integer (201)", async () => {
    verifyAuthMock.mockResolvedValue({
      id: UUID_A,
      role: "SUPER_ADMIN",
      organizationId: "org1",
    });
    checkFeatureAccessMock.mockResolvedValue({ allowed: true });

    const payload = {
      lessonType: "EXAM",
      instructorId: UUID_A,
      studentIds: [UUID_B],
      lessonDate: "2026-01-06",
      startTime: "10:00",
      endTime: "11:00",
      vehicleId: 7,
    };

    const res = await POST(reqJson(payload) as any);

    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(h.lessonCreateMock).toHaveBeenCalled();
    expect(checkFeatureAccessMock).toHaveBeenCalled();
  });

  it("returns 400 when EXAM payload has vehicleId as string (validation)", async () => {
    verifyAuthMock.mockResolvedValue({
      id: UUID_A,
      role: "SUPER_ADMIN",
      organizationId: "org1",
    });

    const payload = {
      lessonType: "EXAM",
      instructorId: UUID_A,
      studentIds: [UUID_B],
      lessonDate: "2026-01-06",
      startTime: "10:00",
      endTime: "11:00",
      vehicleId: "7",
    };

    const res = await POST(reqJson(payload) as any);

    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when EXAM exceeds MAX_STUDENTS_PER_EXAM", async () => {
    verifyAuthMock.mockResolvedValue({
      id: UUID_A,
      role: "SUPER_ADMIN",
      organizationId: "org1",
    });

    const payload = {
      lessonType: "EXAM",
      instructorId: UUID_A,
      studentIds: [UUID_B, UUID_C, UUID_D],
      lessonDate: "2026-01-06",
      startTime: "10:00",
      endTime: "11:00",
    };

    const res = await POST(reqJson(payload) as any);

    expect(res.status).toBe(400);
    const body: any = await res.json();

    expect(body.error).toMatch(/Maximum/i);
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
  });

  it("demo org + sandbox disabled blocks POST with demo_restricted_action", async () => {
    verifyAuthMock.mockResolvedValue({
      id: UUID_A,
      role: "SUPER_ADMIN",
      organizationId: "org-demo",
    });
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });

    const payload = {
      lessonType: "THEORY",
      instructorId: UUID_A,
      lessonDate: "2026-01-06",
      startTime: "10:00",
      endTime: "11:00",
    };

    const res = await POST(reqJson(payload) as any);

    expect(res.status).toBe(403);
    const body: any = await res.json();
    expect(body.code).toBe("demo_restricted_action");
    expect(body.error).toBe(
      "This action is restricted in the public demo environment.",
    );
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
  });

  it("demo org + sandbox enabled + quota available allows THEORY create", async () => {
    verifyAuthMock.mockResolvedValue({
      id: UUID_A,
      role: "SUPER_ADMIN",
      organizationId: "org-demo",
    });
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });
    process.env.DEMO_WRITE_SANDBOX_ENABLED = "true";
    h.lessonCountMock.mockResolvedValue(0);

    const payload = {
      lessonType: "THEORY",
      instructorId: UUID_A,
      lessonDate: "2026-01-06",
      startTime: "10:00",
      endTime: "11:00",
    };

    const res = await POST(reqJson(payload) as any);

    expect(res.status).toBe(201);
    expect(h.lessonCreateMock).toHaveBeenCalled();
  });

  it("demo org + sandbox enabled + quota used returns demo_write_quota_exceeded", async () => {
    verifyAuthMock.mockResolvedValue({
      id: UUID_A,
      role: "SUPER_ADMIN",
      organizationId: "org-demo",
    });
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });
    process.env.DEMO_WRITE_SANDBOX_ENABLED = "true";
    h.lessonCountMock.mockResolvedValue(1);

    const payload = {
      lessonType: "THEORY",
      instructorId: UUID_A,
      lessonDate: "2026-01-06",
      startTime: "10:00",
      endTime: "11:00",
    };

    const res = await POST(reqJson(payload) as any);

    expect(res.status).toBe(403);
    const body: any = await res.json();
    expect(body.code).toBe("demo_write_quota_exceeded");
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
  });
});
