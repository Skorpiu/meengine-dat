import { describe, it, expect } from "vitest";
import { buildAdminLessonUpdateRequestBody } from "./lesson-update-request-body";

const UUID_A = "11111111-1111-1111-1111-111111111111";
const UUID_B = "22222222-2222-2222-2222-222222222222";
const UUID_C = "33333333-3333-3333-3333-333333333333";

describe("buildAdminLessonUpdateRequestBody", () => {
  it("includes instructorId and studentId", () => {
    const body = buildAdminLessonUpdateRequestBody({
      lessonDate: "2026-06-15",
      startTime: "09:00",
      endTime: "10:00",
      status: "SCHEDULED",
      instructorId: UUID_A,
      studentId: UUID_B,
    });

    expect(body).toEqual({
      lessonDate: "2026-06-15",
      startTime: "09:00",
      endTime: "10:00",
      status: "SCHEDULED",
      vehicleId: null,
      instructorId: UUID_A,
      studentId: UUID_B,
    });
  });

  it("converts vehicleId string to positive integer", () => {
    const body = buildAdminLessonUpdateRequestBody({
      lessonDate: "2026-06-15",
      startTime: "09:00",
      endTime: "10:00",
      vehicleId: "42",
      instructorId: UUID_A,
      studentId: UUID_B,
    });

    expect(body.vehicleId).toBe(42);
    expect(typeof body.vehicleId).toBe("number");
  });

  it("normalizes invalid vehicleId to null", () => {
    const body = buildAdminLessonUpdateRequestBody({
      lessonDate: "2026-06-15",
      startTime: "09:00",
      endTime: "10:00",
      vehicleId: "not-a-number",
      instructorId: UUID_A,
    });

    expect(body.vehicleId).toBeNull();
  });

  it("omits instructorId and studentId when empty", () => {
    const body = buildAdminLessonUpdateRequestBody({
      lessonDate: "2026-06-15",
      startTime: "09:00",
      endTime: "10:00",
    });

    expect(body).toEqual({
      lessonDate: "2026-06-15",
      startTime: "09:00",
      endTime: "10:00",
      vehicleId: null,
    });
    expect(body).not.toHaveProperty("instructorId");
    expect(body).not.toHaveProperty("studentId");
  });

  it("uses override instructorId for instructor role booking", () => {
    const body = buildAdminLessonUpdateRequestBody(
      {
        lessonDate: "2026-06-15",
        startTime: "09:00",
        endTime: "10:00",
        instructorId: UUID_A,
        studentId: UUID_B,
      },
      { instructorId: UUID_C },
    );

    expect(body.instructorId).toBe(UUID_C);
  });
});
