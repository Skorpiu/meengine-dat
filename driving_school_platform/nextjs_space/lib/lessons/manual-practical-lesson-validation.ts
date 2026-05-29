/**
 * Validation for manual practical lesson history API.
 */
import { z } from "zod";
import { commonSchemas } from "@/lib/validation";

export const MANUAL_PRACTICAL_LESSON_DEFAULT_DURATION_MINUTES = 60;
export const MANUAL_PRACTICAL_LESSON_MAX_NUMBER = 999;

export const createManualPracticalLessonBodySchema = z.object({
  lessonDate: commonSchemas.date,
  startTime: commonSchemas.time,
  instructorId: commonSchemas.uuid,
  practicalLessonNumber: z
    .number({ required_error: "practical_lesson_number_required" })
    .int("practical_lesson_number_must_be_integer")
    .min(1, "practical_lesson_number_out_of_range")
    .max(
      MANUAL_PRACTICAL_LESSON_MAX_NUMBER,
      "practical_lesson_number_out_of_range",
    ),
  durationMinutes: z
    .number()
    .int()
    .min(1, "duration_minutes_invalid")
    .max(480, "duration_minutes_invalid")
    .optional()
    .default(MANUAL_PRACTICAL_LESSON_DEFAULT_DURATION_MINUTES),
  notes: z.string().trim().optional(),
});

export type CreateManualPracticalLessonBody = z.output<
  typeof createManualPracticalLessonBodySchema
>;

/** Compute end time HH:mm from start time and duration (same-day, no overflow guard beyond 24h). */
export function addMinutesToTime(
  startTime: string,
  durationMinutes: number,
): string {
  const [hourPart, minutePart] = startTime.split(":").map(Number);
  const totalMinutes = hourPart * 60 + minutePart + durationMinutes;
  const endHour = Math.floor(totalMinutes / 60) % 24;
  const endMinute = totalMinutes % 60;
  return `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
}
