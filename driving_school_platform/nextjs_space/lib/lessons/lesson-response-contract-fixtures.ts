/**
 * Minimal lesson list/calendar fixtures for DTO contract tests (pre-minimization).
 * Intentionally includes nested relations the UI reads; never includes passwordHash.
 */
export function sampleLessonListItemFixture(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "lesson-contract-1",
    lessonType: "DRIVING",
    status: "SCHEDULED",
    lessonDate: new Date("2026-02-15T00:00:00.000Z"),
    startTime: "10:00",
    endTime: "11:00",
    pickupLocation: "Main garage",
    dropoffLocation: "Training lot",
    student: {
      user: { firstName: "Sam", lastName: "Student" },
    },
    instructor: {
      user: { firstName: "Ian", lastName: "Instructor" },
    },
    vehicle: {
      registrationNumber: "AB-12-CD",
      make: "VW",
      model: "Golf",
    },
    category: { name: "B" },
    ...overrides,
  };
}
