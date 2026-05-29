import {
  getPracticalLessonNumberLabel,
  isExamLessonType,
} from "@/lib/lessons/lesson-display";
import {
  getStudentDisplayName,
  type StudentDisplaySource,
} from "@/lib/students/student-display";

/** Tailwind classes for Schedule Map chips by lesson type (status overrides separate). */
export const SCHEDULE_MAP_LESSON_TYPE_COLOR_CLASSES = {
  THEORY: "bg-green-50 border-green-300 text-green-800",
  DRIVING: "bg-blue-50 border-blue-300 text-blue-800",
  THEORY_EXAM: "bg-yellow-50 border-yellow-400 text-yellow-900",
  EXAM: "bg-orange-100 border-orange-400 text-orange-900",
} as const;

export type ScheduleMapLessonType =
  keyof typeof SCHEDULE_MAP_LESSON_TYPE_COLOR_CLASSES;

export type ScheduleMapCardLesson = {
  startTime: string;
  endTime?: string;
  lessonType: string;
  practicalLessonNumber?: number | null;
  student?: StudentDisplaySource;
  instructor?: {
    user?: { firstName?: string | null; lastName?: string | null };
  };
  vehicle?: {
    registrationNumber?: string | null;
    make?: string | null;
    model?: string | null;
  } | null;
  category?: { name?: string | null };
};

export function getScheduleLessonTypeShortLabel(lessonType: string): string {
  if (lessonType === "DRIVING") return "Drive";
  if (lessonType === "THEORY") return "Theory";
  if (lessonType === "THEORY_EXAM") return "Th. exam";
  if (lessonType === "EXAM") return "Exam";
  return lessonType;
}

/** Type-based chip color (THEORY green, DRIVING blue, THEORY_EXAM yellow, EXAM orange). */
export function getScheduleLessonTypeColorClasses(lessonType: string): string {
  if (lessonType === "THEORY")
    return SCHEDULE_MAP_LESSON_TYPE_COLOR_CLASSES.THEORY;
  if (lessonType === "DRIVING")
    return SCHEDULE_MAP_LESSON_TYPE_COLOR_CLASSES.DRIVING;
  if (lessonType === "THEORY_EXAM")
    return SCHEDULE_MAP_LESSON_TYPE_COLOR_CLASSES.THEORY_EXAM;
  if (lessonType === "EXAM") return SCHEDULE_MAP_LESSON_TYPE_COLOR_CLASSES.EXAM;
  return "bg-gray-100 border-gray-300 text-gray-800";
}

/** Schedule Map card color: status overrides, then lesson type. */
export function getScheduleMapLessonColorClasses(input: {
  lessonType: string;
  status?: string | null;
}): string {
  if (input.status === "COMPLETED")
    return "bg-green-100 border-green-300 text-green-800";
  if (input.status === "CANCELLED")
    return "bg-red-100 border-red-300 text-red-800";
  return getScheduleLessonTypeColorClasses(input.lessonType);
}

export function formatScheduleParticipantName(
  participant?: ScheduleMapCardLesson["student"],
): string {
  if (!participant) return "";
  return getStudentDisplayName(participant);
}

/** Compact lines for calendar chips (max 3 lines). */
export function getScheduleMapChipLines(
  lesson: ScheduleMapCardLesson,
  options?: { preferInstructor?: boolean },
): string[] {
  const preferInstructor = options?.preferInstructor ?? false;
  const typeLabel = getScheduleLessonTypeShortLabel(lesson.lessonType);
  const practicalLabel = getPracticalLessonNumberLabel(lesson);
  const headlineLabel = practicalLabel ?? typeLabel;
  const lines: string[] = [`${headlineLabel} · ${lesson.startTime}`];

  const person = preferInstructor
    ? formatScheduleParticipantName(lesson.instructor)
    : formatScheduleParticipantName(lesson.student);
  const fallbackPerson = preferInstructor
    ? formatScheduleParticipantName(lesson.student)
    : formatScheduleParticipantName(lesson.instructor);

  const displayPerson = person || fallbackPerson;
  if (displayPerson) {
    lines.push(displayPerson);
  }

  const reg = lesson.vehicle?.registrationNumber?.trim();
  const category = lesson.category?.name?.trim();
  if (isExamLessonType(lesson.lessonType) && category) {
    lines.push(category);
  } else if (reg) {
    lines.push(reg);
  }

  return lines.slice(0, 3);
}
