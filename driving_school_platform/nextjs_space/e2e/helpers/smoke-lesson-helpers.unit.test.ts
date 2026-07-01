import { describe, expect, it } from "vitest";
import {
  assertSmokeLessonMatchesFixture,
  buildSmokeDrivingLessonCreateBody,
  buildSmokeDrivingLessonSlot,
  createSmokeDrivingLesson,
  parseSmokeLessonCreateResponse,
  parseSmokeLessonDetail,
  resolveSmokeRunLabel,
  shiftSmokeLessonSlot,
  summarizeSmokeLessonAssertions,
  type SmokeLessonSlot,
} from "./smoke-lesson-helpers";
import type { SmokeFixtureConfig } from "./smoke-fixture-preflight";

const baseConfig: SmokeFixtureConfig = {
  organizationId: "org-smoke-1",
  studentId: "student-1",
  instructorUserId: "instructor-user-1",
  vehicleId: 90,
  expected: {},
};

describe("resolveSmokeRunLabel", () => {
  it("uses DAT_SMOKE_RUN_ID when set", () => {
    const previous = process.env.DAT_SMOKE_RUN_ID;
    process.env.DAT_SMOKE_RUN_ID = "manual-20260701120000";
    expect(resolveSmokeRunLabel()).toBe("manual-20260701120000");
    if (previous === undefined) delete process.env.DAT_SMOKE_RUN_ID;
    else process.env.DAT_SMOKE_RUN_ID = previous;
  });
});

describe("buildSmokeDrivingLessonSlot", () => {
  it("returns a future dated slot with HH:mm times", () => {
    const slot = buildSmokeDrivingLessonSlot("stable-run-label");
    expect(slot.lessonDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(slot.startTime).toMatch(/^\d{2}:\d{2}$/);
    expect(slot.endTime).toMatch(/^\d{2}:\d{2}$/);
    expect(slot.runLabel).toBe("stable-run-label");

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const expectedDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    expect(slot.lessonDate).toBe(expectedDate);
  });

  it("is deterministic for the same run label", () => {
    const first = buildSmokeDrivingLessonSlot("repeatable-label");
    const second = buildSmokeDrivingLessonSlot("repeatable-label");
    expect(first).toEqual(second);
  });
});

describe("shiftSmokeLessonSlot", () => {
  it("offsets start and end times", () => {
    const base: SmokeLessonSlot = {
      lessonDate: "2026-07-02",
      startTime: "10:00",
      endTime: "11:00",
      runLabel: "run-1",
    };
    const shifted = shiftSmokeLessonSlot(base, 15);
    expect(shifted.startTime).toBe("10:15");
    expect(shifted.endTime).toBe("11:15");
  });
});

describe("buildSmokeDrivingLessonCreateBody", () => {
  it("maps fixture IDs into POST body", () => {
    const slot = buildSmokeDrivingLessonSlot("body-test");
    expect(buildSmokeDrivingLessonCreateBody(baseConfig, slot)).toEqual({
      lessonType: "DRIVING",
      instructorId: "instructor-user-1",
      studentId: "student-1",
      vehicleId: 90,
      lessonDate: slot.lessonDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  });
});

describe("parseSmokeLessonCreateResponse", () => {
  it("parses successResponse lesson payload", () => {
    const lesson = parseSmokeLessonCreateResponse({
      success: true,
      data: {
        message: "Lesson booked successfully",
        lesson: {
          id: "lesson-1",
          lessonType: "DRIVING",
          studentId: "student-1",
          vehicleId: 90,
          practicalLessonNumber: 4,
        },
      },
    });

    expect(lesson?.id).toBe("lesson-1");
    expect(lesson?.lessonType).toBe("DRIVING");
    expect(lesson?.practicalLessonNumber).toBe(4);
  });
});

describe("parseSmokeLessonDetail", () => {
  it("parses nested instructor user id", () => {
    const lesson = parseSmokeLessonDetail({
      id: "lesson-1",
      lessonType: "DRIVING",
      instructor: {
        userId: "instructor-user-1",
        user: { id: "instructor-user-1" },
      },
    });

    expect(lesson?.instructor?.userId).toBe("instructor-user-1");
  });
});

describe("assertSmokeLessonMatchesFixture", () => {
  it("passes when lesson fields match fixture config", () => {
    const results = assertSmokeLessonMatchesFixture(
      {
        id: "lesson-1",
        lessonType: "DRIVING",
        studentId: "student-1",
        vehicleId: 90,
        practicalLessonNumber: 2,
        instructor: { userId: "instructor-user-1" },
      },
      baseConfig,
    );

    expect(summarizeSmokeLessonAssertions(results).ok).toBe(true);
  });

  it("fails when student id does not match", () => {
    const results = assertSmokeLessonMatchesFixture(
      {
        id: "lesson-1",
        lessonType: "DRIVING",
        studentId: "wrong-student",
        vehicleId: 90,
        instructor: { userId: "instructor-user-1" },
      },
      baseConfig,
    );

    expect(results.find((result) => result.name === "lesson_student")?.ok).toBe(
      false,
    );
  });
});

describe("createSmokeDrivingLesson", () => {
  it("throws when POST returns HTTP 400 without creating a lesson", async () => {
    const slot = buildSmokeDrivingLessonSlot("post-400-test");

    await expect(
      createSmokeDrivingLesson(
        async () => ({
          ok: false,
          status: 400,
          json: async () => ({
            error:
              "Instructor has no qualified categories for driving lessons. Please assign categories to this instructor first.",
            statusCode: 400,
          }),
        }),
        baseConfig,
        slot,
      ),
    ).rejects.toThrow("POST /api/admin/lessons failed (HTTP 400)");
  });
});
