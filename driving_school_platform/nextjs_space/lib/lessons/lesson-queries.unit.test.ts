import { describe, it, expect } from "vitest";
import { LESSON_LIST_INCLUDE } from "./lesson-queries";
import { expectLessonIncludeSanitizesNestedUsers } from "./lesson-include-safety";

describe("LESSON_LIST_INCLUDE", () => {
  it("uses safe nested user select instead of user: true", () => {
    expectLessonIncludeSanitizesNestedUsers(LESSON_LIST_INCLUDE);
  });
});
