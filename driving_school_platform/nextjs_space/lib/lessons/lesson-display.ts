import { LESSON_TYPES } from "@/lib/constants";
import {
  getStudentDisplayName,
  type StudentDisplaySource,
} from "@/lib/students/student-display";

/** Lesson types shown on the admin dashboard EXAMS tab (matches API filter). */
export const EXAM_DASHBOARD_LESSON_TYPES = [
  LESSON_TYPES.EXAM,
  LESSON_TYPES.THEORY_EXAM,
] as const;

type NestedUserName = {
  user?: { firstName?: string | null; lastName?: string | null } | null;
} | null;

type LessonStudentParticipant = StudentDisplaySource | NestedUserName | null;

export function isExamLessonType(lessonType?: string | null): boolean {
  return (
    lessonType === LESSON_TYPES.EXAM || lessonType === LESSON_TYPES.THEORY_EXAM
  );
}

export function getExamLessonTypeLabel(lessonType?: string | null): string {
  if (lessonType === LESSON_TYPES.THEORY_EXAM) return "Theoretical exam";
  if (lessonType === LESSON_TYPES.EXAM) return "Practical exam";
  return "Exam";
}

export function getLessonParticipantName(
  participant?: LessonStudentParticipant,
): string {
  return getStudentDisplayName(participant ?? undefined);
}

export function getLessonInstructorName(instructor?: NestedUserName): string {
  return getLessonParticipantName(instructor);
}

export const LESSON_INACTIVE_INSTRUCTOR_WARNING =
  "Assigned instructor is inactive";

export function isLessonInstructorInactive(
  instructor?: { isAvailableForBooking?: boolean | null } | null,
): boolean {
  return instructor?.isAvailableForBooking === false;
}

export function getLessonVehicleLabel(
  vehicle?: {
    registrationNumber?: string | null;
    make?: string | null;
    model?: string | null;
  } | null,
): string | null {
  if (!vehicle) return null;
  const reg = vehicle.registrationNumber?.trim();
  if (reg) return reg;
  const makeModel = [vehicle.make, vehicle.model]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(" ");
  return makeModel || null;
}

export function getLessonDateLabel(
  lessonDate?: string | Date | null,
  locale = "en-US",
): string {
  if (lessonDate == null || lessonDate === "") return "—";
  const date = lessonDate instanceof Date ? lessonDate : new Date(lessonDate);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

export function getLessonLocationLabel(lesson: {
  pickupLocation?: string | null;
  dropoffLocation?: string | null;
}): string | null {
  const pickup = lesson.pickupLocation?.trim();
  if (pickup) return pickup;
  const dropoff = lesson.dropoffLocation?.trim();
  return dropoff || null;
}

/** Display label for assigned practical lesson number (DRIVING only). */
export function getPracticalLessonNumberLabel(lesson: {
  lessonType?: string | null;
  practicalLessonNumber?: number | null;
}): string | null {
  if (lesson.lessonType !== LESSON_TYPES.DRIVING) return null;
  if (
    lesson.practicalLessonNumber == null ||
    lesson.practicalLessonNumber <= 0
  ) {
    return null;
  }
  return `Practice #${lesson.practicalLessonNumber}`;
}

/** Title Case status label for Lesson Management (matches LessonForm edit labels). */
export function getLessonStatusDisplayLabel(status?: string | null): string {
  switch (status) {
    case "SCHEDULED":
      return "Scheduled";
    case "IN_PROGRESS":
      return "In Progress";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "PENDING":
      return "Pending";
    default:
      return status?.trim() ? status : "Scheduled";
  }
}
