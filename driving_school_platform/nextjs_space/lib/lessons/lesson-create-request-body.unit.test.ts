import { describe, it, expect } from "vitest";
import { lessonCreationSchema } from "@/lib/validation";
import { buildAdminLessonCreateRequestBody } from "./lesson-create-request-body";

const UUID_A = "11111111-1111-1111-1111-111111111111";
const UUID_B = "22222222-2222-2222-2222-222222222222";

describe("buildAdminLessonCreateRequestBody", () => {
  it("parses vehicleId string to integer for EXAM", () => {
    const body = buildAdminLessonCreateRequestBody({
      lessonType: "EXAM",
      instructorId: UUID_A,
      studentIds: [UUID_B],
      lessonDate: "2026-01-06",
      startTime: "10:00",
      endTime: "11:00",
      vehicleId: "42",
    });

    expect(body.vehicleId).toBe(42);
    expect(typeof body.vehicleId).toBe("number");

    const parsed = lessonCreationSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  it("omits invalid vehicleId", () => {
    const body = buildAdminLessonCreateRequestBody({
      lessonType: "EXAM",
      instructorId: UUID_A,
      studentIds: [UUID_B],
      lessonDate: "2026-01-06",
      startTime: "10:00",
      endTime: "11:00",
      vehicleId: "not-a-number",
    });

    expect(body.vehicleId).toBeUndefined();
    expect(lessonCreationSchema.safeParse(body).success).toBe(true);
  });

  it("uses override instructorId for instructor booking", () => {
    const body = buildAdminLessonCreateRequestBody(
      {
        lessonType: "THEORY_EXAM",
        instructorId: UUID_A,
        studentIds: [UUID_B],
        lessonDate: "2026-01-06",
        startTime: "10:00",
        endTime: "11:00",
      },
      { instructorId: UUID_B },
    );

    expect(body.instructorId).toBe(UUID_B);
  });
});
