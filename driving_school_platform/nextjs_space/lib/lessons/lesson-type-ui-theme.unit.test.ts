import { describe, it, expect } from "vitest";
import { LESSON_TYPES } from "@/lib/constants";
import {
  getLessonManagementTabActiveClass,
  getLessonTypeDotColorClass,
  LESSON_TYPE_DOT_COLOR_CLASS,
} from "./lesson-type-ui-theme";

describe("lesson-type-ui-theme", () => {
  it("maps lesson types to Schedule Map–aligned dot colors", () => {
    expect(getLessonTypeDotColorClass(LESSON_TYPES.THEORY)).toBe(
      LESSON_TYPE_DOT_COLOR_CLASS.THEORY,
    );
    expect(getLessonTypeDotColorClass(LESSON_TYPES.DRIVING)).toBe(
      LESSON_TYPE_DOT_COLOR_CLASS.DRIVING,
    );
    expect(getLessonTypeDotColorClass(LESSON_TYPES.THEORY_EXAM)).toBe(
      LESSON_TYPE_DOT_COLOR_CLASS.THEORY_EXAM,
    );
    expect(getLessonTypeDotColorClass(LESSON_TYPES.EXAM)).toBe(
      LESSON_TYPE_DOT_COLOR_CLASS.EXAM,
    );
    expect(getLessonTypeDotColorClass("UNKNOWN")).toBe("bg-gray-500");
  });

  it("maps management tabs to active button colors", () => {
    expect(getLessonManagementTabActiveClass("CODE")).toBe("bg-green-600");
    expect(getLessonManagementTabActiveClass("DRIVING")).toBe("bg-blue-600");
    expect(getLessonManagementTabActiveClass("EXAMS")).toBe("bg-orange-600");
  });
});
