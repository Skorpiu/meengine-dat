import { describe, it, expect } from "vitest";
import {
  MAX_LESSON_CALENDAR_RANGE_DAYS,
  validateLessonCalendarRange,
} from "./calendar-range";

describe("validateLessonCalendarRange", () => {
  it("accepts a valid range within the default max days", () => {
    const result = validateLessonCalendarRange({
      from: "2026-01-01",
      to: "2026-01-08",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.from).toBeInstanceOf(Date);
      expect(result.to).toBeInstanceOf(Date);
      expect(result.to.getTime()).toBeGreaterThan(result.from.getTime());
    }
  });

  it("accepts a range spanning exactly 90 calendar days", () => {
    const result = validateLessonCalendarRange({
      from: "2026-01-01",
      to: "2026-04-01",
    });

    expect(result.ok).toBe(true);
  });

  it("rejects null from or to", () => {
    expect(
      validateLessonCalendarRange({ from: null, to: "2026-01-08" }),
    ).toEqual({
      ok: false,
      code: "invalid_calendar_range",
      message: "Invalid lesson calendar date range.",
    });

    expect(
      validateLessonCalendarRange({ from: "2026-01-01", to: null }),
    ).toEqual({
      ok: false,
      code: "invalid_calendar_range",
      message: "Invalid lesson calendar date range.",
    });
  });

  it("rejects invalid from date", () => {
    const result = validateLessonCalendarRange({
      from: "not-a-date",
      to: "2026-01-08",
    });

    expect(result).toEqual({
      ok: false,
      code: "invalid_calendar_range",
      message: "Invalid lesson calendar date range.",
    });
  });

  it("rejects invalid to date", () => {
    const result = validateLessonCalendarRange({
      from: "2026-01-01",
      to: "also-not-a-date",
    });

    expect(result).toEqual({
      ok: false,
      code: "invalid_calendar_range",
      message: "Invalid lesson calendar date range.",
    });
  });

  it("rejects when to is on or before from", () => {
    const sameDay = validateLessonCalendarRange({
      from: "2026-01-15",
      to: "2026-01-15",
    });
    expect(sameDay).toEqual({
      ok: false,
      code: "invalid_calendar_range",
      message: "Invalid lesson calendar date range.",
    });

    const reversed = validateLessonCalendarRange({
      from: "2026-01-20",
      to: "2026-01-10",
    });
    expect(reversed.ok).toBe(false);
    if (!reversed.ok) {
      expect(reversed.code).toBe("invalid_calendar_range");
    }
  });

  it("rejects ranges wider than 90 days", () => {
    const result = validateLessonCalendarRange({
      from: "2026-01-01",
      to: "2026-05-01",
    });

    expect(result).toEqual({
      ok: false,
      code: "calendar_range_too_large",
      message: `Lesson calendar date range cannot exceed ${MAX_LESSON_CALENDAR_RANGE_DAYS} days.`,
    });
  });

  it("honours a custom maxDays limit", () => {
    const within = validateLessonCalendarRange({
      from: "2026-01-01",
      to: "2026-01-05",
      maxDays: 7,
    });
    expect(within.ok).toBe(true);

    const tooWide = validateLessonCalendarRange({
      from: "2026-01-01",
      to: "2026-01-10",
      maxDays: 7,
    });
    expect(tooWide).toEqual({
      ok: false,
      code: "calendar_range_too_large",
      message: "Lesson calendar date range cannot exceed 7 days.",
    });
  });
});
