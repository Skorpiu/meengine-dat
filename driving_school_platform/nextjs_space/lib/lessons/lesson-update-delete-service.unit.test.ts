import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const lessonFindFirstMock = vi.fn();
  const lessonUpdateMock = vi.fn();
  const lessonDeleteManyMock = vi.fn();
  const instructorFindFirstMock = vi.fn();
  const vehicleFindFirstMock = vi.fn();
  const studentFindFirstMock = vi.fn();

  return {
    lessonFindFirstMock,
    lessonUpdateMock,
    lessonDeleteManyMock,
    instructorFindFirstMock,
    vehicleFindFirstMock,
    studentFindFirstMock,
    prismaMock: {
      lesson: {
        findFirst: lessonFindFirstMock,
        update: lessonUpdateMock,
        deleteMany: lessonDeleteManyMock,
      },
      instructor: { findFirst: instructorFindFirstMock },
      vehicle: { findFirst: vehicleFindFirstMock },
      student: { findFirst: studentFindFirstMock },
    },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
}));

import {
  deleteAdminLesson,
  updateAdminLesson,
} from "./lesson-update-delete-service";

const INSTRUCTOR_USER_ID = "11111111-1111-1111-1111-111111111111";
const INSTRUCTOR_ROW_ID = "instructor-row-1";
const STUDENT_ID = "22222222-2222-2222-2222-222222222222";
const OTHER_INSTRUCTOR_USER_ID = "33333333-3333-3333-3333-333333333333";
const LESSON_ID = "lesson-1";

function futureLessonRow(overrides: Record<string, unknown> = {}) {
  return {
    id: LESSON_ID,
    lessonDate: new Date("2030-06-01T00:00:00.000Z"),
    endTime: "23:59",
    instructor: { userId: INSTRUCTOR_USER_ID },
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  h.lessonFindFirstMock.mockResolvedValue(futureLessonRow());
  h.lessonUpdateMock.mockResolvedValue({ id: LESSON_ID, status: "SCHEDULED" });
  h.lessonDeleteManyMock.mockResolvedValue({ count: 1 });
  h.instructorFindFirstMock.mockResolvedValue({
    id: INSTRUCTOR_ROW_ID,
    isAvailableForBooking: true,
  });
  h.studentFindFirstMock.mockResolvedValue({ id: STUDENT_ID });
});

describe("updateAdminLesson", () => {
  it("resolves instructor User.id to Instructor.id and persists studentId", async () => {
    const result = await updateAdminLesson({
      organizationId: "org-1",
      lessonId: LESSON_ID,
      actor: { id: "admin-1", role: "SUPER_ADMIN" },
      payload: {
        startTime: "10:00",
        endTime: "11:00",
        instructorId: INSTRUCTOR_USER_ID,
        studentId: STUDENT_ID,
      },
    });

    expect(result.ok).toBe(true);
    expect(h.instructorFindFirstMock).toHaveBeenCalledWith({
      where: { userId: INSTRUCTOR_USER_ID, organizationId: "org-1" },
      select: { id: true, isAvailableForBooking: true },
    });
    expect(h.studentFindFirstMock).toHaveBeenCalledWith({
      where: { id: STUDENT_ID, organizationId: "org-1" },
      select: { id: true },
    });
    expect(h.lessonUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          instructorId: INSTRUCTOR_ROW_ID,
          studentId: STUDENT_ID,
        }),
      }),
    );
  });

  it("returns 404 when instructor is not in organization", async () => {
    h.instructorFindFirstMock.mockResolvedValue(null);

    const result = await updateAdminLesson({
      organizationId: "org-1",
      lessonId: LESSON_ID,
      actor: { id: "admin-1", role: "SUPER_ADMIN" },
      payload: { instructorId: OTHER_INSTRUCTOR_USER_ID },
    });

    expect(result).toEqual({
      ok: false,
      error: "Instructor not found",
      status: 404,
    });
    expect(h.lessonUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 409 when instructor is not available for booking", async () => {
    h.instructorFindFirstMock.mockResolvedValue({
      id: INSTRUCTOR_ROW_ID,
      isAvailableForBooking: false,
    });

    const result = await updateAdminLesson({
      organizationId: "org-1",
      lessonId: LESSON_ID,
      actor: { id: "admin-1", role: "SUPER_ADMIN" },
      payload: { instructorId: INSTRUCTOR_USER_ID },
    });

    expect(result).toEqual({
      ok: false,
      error: "instructor_not_available_for_booking",
      status: 409,
    });
    expect(h.lessonUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 404 when student is not in organization", async () => {
    h.studentFindFirstMock.mockResolvedValue(null);

    const result = await updateAdminLesson({
      organizationId: "org-1",
      lessonId: LESSON_ID,
      actor: { id: "admin-1", role: "SUPER_ADMIN" },
      payload: { studentId: STUDENT_ID },
    });

    expect(result).toEqual({
      ok: false,
      error: "Student not found",
      status: 404,
    });
    expect(h.lessonUpdateMock).not.toHaveBeenCalled();
  });

  it("forbids instructor role from assigning another instructor", async () => {
    const result = await updateAdminLesson({
      organizationId: "org-1",
      lessonId: LESSON_ID,
      actor: { id: INSTRUCTOR_USER_ID, role: "INSTRUCTOR" },
      payload: { instructorId: OTHER_INSTRUCTOR_USER_ID },
    });

    expect(result).toEqual({
      ok: false,
      error: "Forbidden",
      status: 403,
    });
    expect(h.instructorFindFirstMock).not.toHaveBeenCalled();
    expect(h.lessonUpdateMock).not.toHaveBeenCalled();
  });

  it("does not update instructor or student when omitted from payload", async () => {
    const result = await updateAdminLesson({
      organizationId: "org-1",
      lessonId: LESSON_ID,
      actor: { id: "admin-1", role: "SUPER_ADMIN" },
      payload: { startTime: "10:00", endTime: "11:00" },
    });

    expect(result.ok).toBe(true);
    expect(h.instructorFindFirstMock).not.toHaveBeenCalled();
    expect(h.studentFindFirstMock).not.toHaveBeenCalled();
    const updateData = h.lessonUpdateMock.mock.calls[0]?.[0]?.data;
    expect(updateData).not.toHaveProperty("instructorId");
    expect(updateData).not.toHaveProperty("studentId");
  });

  it("returns 404 when lesson is missing", async () => {
    h.lessonFindFirstMock.mockResolvedValue(null);

    const result = await updateAdminLesson({
      organizationId: "org-1",
      lessonId: "missing",
      actor: { id: "admin-1", role: "SUPER_ADMIN" },
      payload: { status: "SCHEDULED" },
    });

    expect(result).toEqual({
      ok: false,
      error: "Lesson not found",
      status: 404,
    });
  });
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
      id: LESSON_ID,
      lessonDate: new Date("2020-01-01"),
      endTime: "08:00",
      instructor: { userId: INSTRUCTOR_USER_ID },
    });

    const result = await deleteAdminLesson({
      organizationId: "org-1",
      lessonId: LESSON_ID,
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
