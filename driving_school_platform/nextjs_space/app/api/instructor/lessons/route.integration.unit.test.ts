import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const instructorFindFirstMock = vi.fn();
  const getInstructorCalendarLessonsMock = vi.fn();

  return {
    instructorFindFirstMock,
    getInstructorCalendarLessonsMock,
    prismaMock: {
      instructor: { findFirst: instructorFindFirstMock },
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
  getInstructorCalendarLessons: h.getInstructorCalendarLessonsMock,
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
import { sampleLessonListItemFixture } from "@/lib/lessons/lesson-response-contract-fixtures";
import { expectLessonCalendarResponseContract } from "@/lib/lessons/lesson-response-contract";

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
    id: "user-inst",
    role: "INSTRUCTOR",
    organizationId: "org1",
  });
  h.instructorFindFirstMock.mockResolvedValue({ id: "inst-1" });
  h.getInstructorCalendarLessonsMock.mockResolvedValue([{ id: "lesson-1" }]);
});

describe("GET /api/instructor/lessons (calendar range)", () => {
  it("returns lessons for a valid from/to range", async () => {
    const res = await GET(
      reqGet(
        "http://localhost/api/instructor/lessons?from=2026-01-01&to=2026-01-08",
      ) as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lessons).toEqual([{ id: "lesson-1" }]);
    expect(h.getInstructorCalendarLessonsMock).toHaveBeenCalledTimes(1);
  });

  it("DTO contract: lessons with ScheduleMap UI fields and no nested passwordHash", async () => {
    h.getInstructorCalendarLessonsMock.mockResolvedValue([
      sampleLessonListItemFixture({ id: "lesson-inst-1" }),
    ]);

    const res = await GET(
      reqGet(
        "http://localhost/api/instructor/lessons?from=2026-01-01&to=2026-01-08",
      ) as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expectLessonCalendarResponseContract(body);
    expect(body.lessons[0].startTime).toBe("10:00");
    expect(body.lessons[0].lessonType).toBe("DRIVING");
  });

  it("returns 400 invalid_calendar_range for invalid from", async () => {
    const res = await GET(
      reqGet(
        "http://localhost/api/instructor/lessons?from=not-a-date&to=2026-01-08",
      ) as any,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("invalid_calendar_range");
    expect(body.error).toBe("Invalid lesson calendar date range.");
    expect(h.getInstructorCalendarLessonsMock).not.toHaveBeenCalled();
  });

  it("returns 400 calendar_range_too_large when span exceeds 90 days", async () => {
    const res = await GET(
      reqGet(
        "http://localhost/api/instructor/lessons?from=2026-01-01&to=2026-05-01",
      ) as any,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("calendar_range_too_large");
    expect(body.error).toBe(
      "Lesson calendar date range cannot exceed 90 days.",
    );
    expect(h.getInstructorCalendarLessonsMock).not.toHaveBeenCalled();
  });
});
