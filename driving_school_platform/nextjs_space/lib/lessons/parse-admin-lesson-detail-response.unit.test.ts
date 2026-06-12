import { describe, expect, it } from "vitest";
import {
  isInstructorEditLessonOwner,
  parseAdminLessonDetailResponse,
} from "./parse-admin-lesson-detail-response";

describe("parseAdminLessonDetailResponse", () => {
  it("parses successResponse wrapper", () => {
    const lesson = {
      id: "lesson-1",
      lessonType: "DRIVING",
      instructorId: "inst-1",
    };

    const parsed = parseAdminLessonDetailResponse({
      success: true,
      data: lesson,
    });

    expect(parsed).toEqual(lesson);
  });

  it("parses bare lesson object", () => {
    const lesson = { id: "lesson-2", lessonType: "THEORY" };
    expect(parseAdminLessonDetailResponse(lesson)).toEqual(lesson);
  });

  it("returns null for invalid shapes", () => {
    expect(parseAdminLessonDetailResponse(null)).toBeNull();
    expect(parseAdminLessonDetailResponse({ success: true })).toBeNull();
    expect(parseAdminLessonDetailResponse("bad")).toBeNull();
  });
});

describe("isInstructorEditLessonOwner", () => {
  it("returns true when instructor user id matches", () => {
    expect(
      isInstructorEditLessonOwner(
        {
          instructor: { user: { id: "user-1" } },
        } as Parameters<typeof isInstructorEditLessonOwner>[0],
        "user-1",
      ),
    ).toBe(true);
  });

  it("returns false when instructor user id differs", () => {
    expect(
      isInstructorEditLessonOwner(
        {
          instructor: { user: { id: "user-1" } },
        } as Parameters<typeof isInstructorEditLessonOwner>[0],
        "user-2",
      ),
    ).toBe(false);
  });
});
