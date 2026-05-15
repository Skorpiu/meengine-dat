import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const instructorFindFirstMock = vi.fn();
  const lessonCreateMock = vi.fn();

  return {
    instructorFindFirstMock,
    lessonCreateMock,
    prismaMock: {
      instructor: { findFirst: instructorFindFirstMock },
      lesson: { create: lessonCreateMock },
      vehicle: { findFirst: vi.fn() },
      category: { findFirst: vi.fn() },
      student: { findFirst: vi.fn() },
    },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
}));

import { createAdminLesson } from "./lesson-create-service";

beforeEach(() => {
  vi.resetAllMocks();
  h.instructorFindFirstMock.mockResolvedValue({
    id: "inst-1",
    qualifiedCategories: [{ id: 1 }],
  });
  h.lessonCreateMock.mockResolvedValue({ id: "lesson-1" });
});

describe("createAdminLesson", () => {
  it("returns 400 when EXAM exceeds max students per exam", async () => {
    const result = await createAdminLesson({
      organizationId: "org-1",
      durationMinutes: 60,
      payload: {
        lessonType: "EXAM",
        instructorId: "user-inst",
        studentIds: ["s1", "s2", "s3"],
        lessonDate: "2026-01-06",
        startTime: "10:00",
        endTime: "11:00",
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Maximum/i);
      expect(result.status).toBe(400);
    }
    expect(h.lessonCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when duration is not positive", async () => {
    const result = await createAdminLesson({
      organizationId: "org-1",
      durationMinutes: 0,
      payload: {
        lessonType: "THEORY",
        instructorId: "user-inst",
        lessonDate: "2026-01-06",
        startTime: "10:00",
        endTime: "10:00",
      },
    });

    expect(result).toEqual({
      ok: false,
      error: "End time must be after start time",
      status: 400,
    });
  });
});
