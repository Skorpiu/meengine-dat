import { expect } from "vitest";
import { expectLessonJsonHasNoNestedPasswordHash } from "@/lib/lessons/lesson-include-safety";

type LessonLike = Record<string, unknown>;

/**
 * Fields used by admin lessons UI, ScheduleMap, and lesson-display helpers.
 * Intentionally narrow — not a full Prisma row snapshot.
 */
export function expectLessonListItemUiContract(lesson: LessonLike): void {
  expect(lesson.id).toBeTruthy();
  expect(lesson.lessonType).toBeTruthy();
  expect(lesson.status).toBeTruthy();
  expect(lesson.lessonDate).toBeDefined();
  expect(lesson.startTime).toBeTruthy();
  expect(lesson.endTime).toBeTruthy();

  if (lesson.pickupLocation != null) {
    expect(typeof lesson.pickupLocation).toBe("string");
  }
  if (lesson.dropoffLocation != null) {
    expect(typeof lesson.dropoffLocation).toBe("string");
  }

  const student = lesson.student as LessonLike | undefined;
  if (student?.user) {
    const user = student.user as LessonLike;
    expect(user.firstName).toBeTruthy();
    expect(user.lastName).toBeTruthy();
    expect(user.passwordHash).toBeUndefined();
  }

  const instructor = lesson.instructor as LessonLike | undefined;
  if (instructor?.user) {
    const user = instructor.user as LessonLike;
    expect(user.firstName).toBeTruthy();
    expect(user.lastName).toBeTruthy();
    expect(user.passwordHash).toBeUndefined();
  }

  const vehicle = lesson.vehicle as LessonLike | undefined;
  if (vehicle) {
    expect(vehicle.registrationNumber).toBeTruthy();
    expect(vehicle.make).toBeTruthy();
    expect(vehicle.model).toBeTruthy();
  }

  const category = lesson.category as LessonLike | undefined;
  if (category) {
    expect(category.name).toBeTruthy();
  }
}

/** `{ lessons }` calendar GET contract. */
export function expectLessonCalendarResponseContract(body: LessonLike): void {
  expect(body).toHaveProperty("lessons");
  expect(body.success).toBeUndefined();
  expect(Array.isArray(body.lessons)).toBe(true);

  const lessons = body.lessons as LessonLike[];
  expect(lessons.length).toBeGreaterThan(0);
  for (const lesson of lessons) {
    expectLessonListItemUiContract(lesson);
  }
  expectLessonJsonHasNoNestedPasswordHash(body);
}

/** Admin dashboard `{ success, data: { recent, current, upcoming } }` contract. */
export function expectAdminDashboardLessonsResponseContract(
  body: LessonLike,
): void {
  expect(body.success).toBe(true);
  expect(body).not.toHaveProperty("lessons");

  const data = body.data as LessonLike;
  expect(data).toBeDefined();
  for (const slice of ["recent", "current", "upcoming"] as const) {
    expect(Array.isArray(data[slice])).toBe(true);
  }

  const allLessons = [
    ...(data.recent as LessonLike[]),
    ...(data.current as LessonLike[]),
    ...(data.upcoming as LessonLike[]),
  ];
  expect(allLessons.length).toBeGreaterThan(0);
  for (const lesson of allLessons) {
    expectLessonListItemUiContract(lesson);
  }
  expectLessonJsonHasNoNestedPasswordHash(body);
}

/** Admin lesson detail `successResponse` contract. */
export function expectAdminLessonDetailResponseContract(
  body: LessonLike,
): void {
  expect(body.success).toBe(true);
  expect(body.data).toBeDefined();

  const lesson = body.data as LessonLike;
  expect(lesson.id).toBeTruthy();
  expectLessonListItemUiContract(lesson);
  expectLessonJsonHasNoNestedPasswordHash(body);
}
