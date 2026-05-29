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
      id: "student-row-1",
      firstName: "Sam",
      lastName: "Student",
      schoolStudentId: "26001",
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

/** Fixture for GET/PUT admin lesson detail (edit form fields). */
export function sampleLessonDetailFixture(
  overrides: Record<string, unknown> = {},
) {
  const UUID_A = "11111111-1111-1111-1111-111111111111";
  const UUID_B = "22222222-2222-2222-2222-222222222222";

  return {
    id: "lesson-detail-1",
    lessonType: "DRIVING",
    status: "SCHEDULED",
    lessonDate: new Date("2026-02-15T00:00:00.000Z"),
    startTime: "10:00",
    endTime: "11:00",
    vehicleId: 7,
    studentId: "student-row-1",
    instructorId: "instructor-row-1",
    student: {
      id: "student-row-1",
      userId: UUID_B,
      firstName: "Sam",
      lastName: "Student",
      schoolStudentId: "26001",
      user: { id: UUID_B, firstName: "Sam", lastName: "Student" },
    },
    instructor: {
      id: "instructor-row-1",
      userId: UUID_A,
      user: { id: UUID_A, firstName: "Ian", lastName: "Instructor" },
    },
    vehicle: {
      id: 7,
      registrationNumber: "AB-12-CD",
      make: "VW",
      model: "Golf",
    },
    ...overrides,
  };
}
