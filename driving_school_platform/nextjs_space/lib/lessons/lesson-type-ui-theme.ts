import { LESSON_TYPES } from "@/lib/constants";

/**
 * Solid dot colors for Lesson Management lists — aligned with Schedule Map
 * type semantics (Theory green, Driving blue, Theory exam yellow, Practical exam orange).
 */
export const LESSON_TYPE_DOT_COLOR_CLASS = {
  THEORY: "bg-green-500",
  DRIVING: "bg-blue-500",
  THEORY_EXAM: "bg-yellow-500",
  EXAM: "bg-orange-500",
} as const;

/** Active tab button classes for `/admin/lessons` view switcher. */
export const LESSON_MANAGEMENT_TAB_ACTIVE_CLASS = {
  CODE: "bg-green-600",
  DRIVING: "bg-blue-600",
  EXAMS: "bg-orange-600",
} as const;

export function getLessonTypeDotColorClass(lessonType?: string | null): string {
  if (lessonType === LESSON_TYPES.THEORY) {
    return LESSON_TYPE_DOT_COLOR_CLASS.THEORY;
  }
  if (lessonType === LESSON_TYPES.DRIVING) {
    return LESSON_TYPE_DOT_COLOR_CLASS.DRIVING;
  }
  if (lessonType === LESSON_TYPES.THEORY_EXAM) {
    return LESSON_TYPE_DOT_COLOR_CLASS.THEORY_EXAM;
  }
  if (lessonType === LESSON_TYPES.EXAM) {
    return LESSON_TYPE_DOT_COLOR_CLASS.EXAM;
  }
  return "bg-gray-500";
}

export function getLessonManagementTabActiveClass(
  view: keyof typeof LESSON_MANAGEMENT_TAB_ACTIVE_CLASS,
): string {
  return LESSON_MANAGEMENT_TAB_ACTIVE_CLASS[view];
}
