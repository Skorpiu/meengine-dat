import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const studentFindFirstMock = vi.fn();
  const getStudentCalendarLessonsMock = vi.fn();

  return {
    studentFindFirstMock,
    getStudentCalendarLessonsMock,
    prismaMock: {
      student: { findFirst: studentFindFirstMock },
    },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
}));

vi.mock("@/lib/tenant", () => ({
  guardTenantAuthenticatedRoute: vi.fn(),
}));

vi.mock("@/lib/lessons/lesson-queries", () => ({
  getStudentCalendarLessons: h.getStudentCalendarLessonsMock,
}));

vi.mock("@/lib/api-utils", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils");
  return {
    ...actual,
    verifyAuth: vi.fn(),
  };
});

import { GET } from "./route";
import { verifyAuth } from "@/lib/api-utils";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";

const verifyAuthMock = verifyAuth as unknown as ReturnType<typeof vi.fn>;
const guardTenantMock = guardTenantAuthenticatedRoute as unknown as ReturnType<
  typeof vi.fn
>;

function reqGet(url: string): Request {
  return new Request(url, { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  guardTenantMock.mockResolvedValue({ allowed: true });
  verifyAuthMock.mockResolvedValue({
    id: "user-student",
    role: "STUDENT",
    organizationId: "org1",
  });
  h.studentFindFirstMock.mockResolvedValue({ id: "student-1" });
  h.getStudentCalendarLessonsMock.mockResolvedValue([{ id: "lesson-1" }]);
});

describe("GET /api/student/lessons (calendar range)", () => {
  it("returns lessons for a valid from/to range", async () => {
    const res = await GET(
      reqGet(
        "http://localhost/api/student/lessons?from=2026-01-01&to=2026-01-08",
      ) as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lessons).toEqual([{ id: "lesson-1" }]);
    expect(h.getStudentCalendarLessonsMock).toHaveBeenCalledTimes(1);
  });

  it("returns 400 invalid_calendar_range for invalid from", async () => {
    const res = await GET(
      reqGet(
        "http://localhost/api/student/lessons?from=not-a-date&to=2026-01-08",
      ) as any,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("invalid_calendar_range");
    expect(body.error).toBe("Invalid lesson calendar date range.");
    expect(h.getStudentCalendarLessonsMock).not.toHaveBeenCalled();
  });

  it("returns 400 calendar_range_too_large when span exceeds 90 days", async () => {
    const res = await GET(
      reqGet(
        "http://localhost/api/student/lessons?from=2026-01-01&to=2026-05-01",
      ) as any,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("calendar_range_too_large");
    expect(body.error).toBe(
      "Lesson calendar date range cannot exceed 90 days.",
    );
    expect(h.getStudentCalendarLessonsMock).not.toHaveBeenCalled();
  });
});
