import { describe, it, expect } from "vitest";
import { LESSON_DETAIL_SELECT, LESSON_LIST_SELECT } from "./lesson-queries";
import {
  expectLessonSelectSanitizesNestedUsers,
  expectLessonJsonHasNoNestedPasswordHash,
} from "./lesson-include-safety";

describe("LESSON_LIST_SELECT", () => {
  it("uses safe nested user select instead of user: true", () => {
    expectLessonSelectSanitizesNestedUsers(LESSON_LIST_SELECT);
  });

  it("includes only UI-used lesson scalars and relation fields", () => {
    const keys = Object.keys(LESSON_LIST_SELECT).sort();
    expect(keys).toEqual([
      "category",
      "dropoffLocation",
      "endTime",
      "id",
      "instructor",
      "lessonDate",
      "lessonType",
      "pickupLocation",
      "practicalLessonNumber",
      "startTime",
      "status",
      "student",
      "vehicle",
    ]);
    const serialized = JSON.stringify(LESSON_LIST_SELECT);
    for (const heavy of [
      "passwordHash",
      "lessonPrice",
      "paymentStatus",
      "adminNotes",
      "skillsPracticed",
      "durationMinutes",
    ]) {
      expect(serialized).not.toContain(heavy);
    }
  });

  it("vehicle and category nested selects are minimal", () => {
    expect(LESSON_LIST_SELECT.vehicle.select).toEqual({
      id: true,
      registrationNumber: true,
      make: true,
      model: true,
      isActive: true,
      underMaintenance: true,
      status: true,
    });
    expect(LESSON_LIST_SELECT.category.select).toEqual({
      id: true,
      name: true,
    });
  });
});

describe("LESSON_DETAIL_SELECT", () => {
  it("uses safe nested user select and edit-form scalars only", () => {
    expectLessonSelectSanitizesNestedUsers(LESSON_DETAIL_SELECT);

    const keys = Object.keys(LESSON_DETAIL_SELECT).sort();
    expect(keys).toEqual([
      "endTime",
      "id",
      "instructor",
      "instructorId",
      "lessonDate",
      "lessonType",
      "practicalLessonNumber",
      "startTime",
      "status",
      "student",
      "studentId",
      "vehicle",
      "vehicleId",
    ]);

    const serialized = JSON.stringify(LESSON_DETAIL_SELECT);
    for (const heavy of [
      "passwordHash",
      "lessonPrice",
      "paymentStatus",
      "pickupLocation",
      "category",
    ]) {
      expect(serialized).not.toContain(heavy);
    }
  });

  it("instructor select includes booking availability for schedule warnings", () => {
    expect(LESSON_LIST_SELECT.instructor.select?.isAvailableForBooking).toBe(
      true,
    );
  });

  it("instructor select includes userId for access checks", () => {
    expect(LESSON_DETAIL_SELECT.instructor.select?.userId).toBe(true);
  });
});

describe("LESSON_LIST_SELECT sample payload", () => {
  it("serializes without passwordHash when nested users are present", () => {
    const sample = {
      id: "l1",
      lessonType: "DRIVING",
      status: "SCHEDULED",
      lessonDate: new Date(),
      startTime: "10:00",
      endTime: "11:00",
      pickupLocation: "A",
      dropoffLocation: "B",
      student: { id: "s1", user: { id: "u1", firstName: "A", lastName: "B" } },
      instructor: {
        id: "i1",
        user: { id: "u2", firstName: "C", lastName: "D" },
      },
      vehicle: {
        id: 1,
        registrationNumber: "X",
        make: "M",
        model: "Y",
      },
      category: { id: 1, name: "B" },
    };
    expectLessonJsonHasNoNestedPasswordHash(sample);
  });
});
