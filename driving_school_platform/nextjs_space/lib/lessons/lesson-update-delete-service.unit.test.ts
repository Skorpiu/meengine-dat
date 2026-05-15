import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const lessonFindFirstMock = vi.fn();
  const lessonDeleteManyMock = vi.fn();

  return {
    lessonFindFirstMock,
    lessonDeleteManyMock,
    prismaMock: {
      lesson: {
        findFirst: lessonFindFirstMock,
        update: vi.fn(),
        deleteMany: lessonDeleteManyMock,
      },
      vehicle: { findFirst: vi.fn() },
    },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
}));

import { deleteAdminLesson } from "./lesson-update-delete-service";

beforeEach(() => {
  vi.resetAllMocks();
  h.lessonFindFirstMock.mockResolvedValue({
    id: "lesson-1",
    lessonDate: new Date("2030-06-01"),
    endTime: "23:59",
    instructor: { userId: "user-1" },
  });
  h.lessonDeleteManyMock.mockResolvedValue({ count: 1 });
});

describe("deleteAdminLesson", () => {
  it("returns 404 when lesson is missing", async () => {
    h.lessonFindFirstMock.mockResolvedValue(null);

    const result = await deleteAdminLesson({
      organizationId: "org-1",
      lessonId: "missing",
      actor: { id: "admin-1", role: "SUPER_ADMIN" },
    });

    expect(result).toEqual({
      ok: false,
      error: "Lesson not found",
      status: 404,
    });
    expect(h.lessonDeleteManyMock).not.toHaveBeenCalled();
  });

  it("returns 400 when lesson already ended", async () => {
    h.lessonFindFirstMock.mockResolvedValue({
      id: "lesson-1",
      lessonDate: new Date("2020-01-01"),
      endTime: "08:00",
      instructor: { userId: "user-1" },
    });

    const result = await deleteAdminLesson({
      organizationId: "org-1",
      lessonId: "lesson-1",
      actor: { id: "admin-1", role: "SUPER_ADMIN" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Cannot delete a lesson that already ended");
      expect(result.status).toBe(400);
    }
    expect(h.lessonDeleteManyMock).not.toHaveBeenCalled();
  });
});
