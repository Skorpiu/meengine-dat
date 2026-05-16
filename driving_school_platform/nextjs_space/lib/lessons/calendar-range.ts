import { differenceInCalendarDays, startOfDay } from "date-fns";

export const MAX_LESSON_CALENDAR_RANGE_DAYS = 90;

export type CalendarRangeValidationResult =
  | { ok: true; from: Date; to: Date }
  | {
      ok: false;
      code: "invalid_calendar_range" | "calendar_range_too_large";
      message: string;
    };

function parseDate(value: string): Date | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

/**
 * Validates admin lesson calendar query bounds (`from` / `to`).
 * Pure helper — no Prisma or Next.js dependencies.
 */
export function validateLessonCalendarRange(input: {
  from: string | null;
  to: string | null;
  maxDays?: number;
}): CalendarRangeValidationResult {
  const maxDays = input.maxDays ?? MAX_LESSON_CALENDAR_RANGE_DAYS;

  if (input.from == null || input.to == null) {
    return {
      ok: false,
      code: "invalid_calendar_range",
      message: "Invalid lesson calendar date range.",
    };
  }

  const fromRaw = parseDate(input.from);
  const toRaw = parseDate(input.to);

  if (!fromRaw || !toRaw) {
    return {
      ok: false,
      code: "invalid_calendar_range",
      message: "Invalid lesson calendar date range.",
    };
  }

  const from = startOfDay(fromRaw);
  const to = startOfDay(toRaw);

  if (to.getTime() < from.getTime()) {
    return {
      ok: false,
      code: "invalid_calendar_range",
      message: "Invalid lesson calendar date range.",
    };
  }

  const spanDays = differenceInCalendarDays(to, from);
  if (spanDays > maxDays) {
    return {
      ok: false,
      code: "calendar_range_too_large",
      message: `Lesson calendar date range cannot exceed ${maxDays} days.`,
    };
  }

  return { ok: true, from, to };
}
