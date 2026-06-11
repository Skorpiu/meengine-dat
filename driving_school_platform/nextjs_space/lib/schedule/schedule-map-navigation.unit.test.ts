import { describe, expect, it } from "vitest";
import {
  buildScheduleReturnHref,
  isValidScheduleFocusDate,
  parseScheduleReturnParams,
  SCHEDULE_FOCUS_DATE_QUERY,
  SCHEDULE_REFRESH_QUERY,
} from "./schedule-map-navigation";

describe("schedule-map-navigation", () => {
  describe("isValidScheduleFocusDate", () => {
    it("accepts valid YYYY-MM-DD dates", () => {
      expect(isValidScheduleFocusDate("2026-06-15")).toBe(true);
      expect(isValidScheduleFocusDate("2026-02-28")).toBe(true);
    });

    it("rejects invalid calendar dates and formats", () => {
      expect(isValidScheduleFocusDate("2026-13-01")).toBe(false);
      expect(isValidScheduleFocusDate("2026-02-30")).toBe(false);
      expect(isValidScheduleFocusDate("06-15-2026")).toBe(false);
      expect(isValidScheduleFocusDate("")).toBe(false);
    });
  });

  describe("parseScheduleReturnParams", () => {
    it("parses focus and refresh flags", () => {
      const params = new URLSearchParams({
        [SCHEDULE_FOCUS_DATE_QUERY]: "2026-06-15",
        [SCHEDULE_REFRESH_QUERY]: "1",
      });

      expect(parseScheduleReturnParams(params)).toEqual({
        focusDate: "2026-06-15",
        shouldRefresh: true,
      });
    });

    it("ignores invalid focusDate values", () => {
      const params = new URLSearchParams({
        [SCHEDULE_FOCUS_DATE_QUERY]: "not-a-date",
        [SCHEDULE_REFRESH_QUERY]: "true",
      });

      expect(parseScheduleReturnParams(params)).toEqual({
        focusDate: null,
        shouldRefresh: true,
      });
    });
  });

  describe("buildScheduleReturnHref", () => {
    it("adds focusDate and refresh query params", () => {
      expect(buildScheduleReturnHref("/admin", "2026-06-15")).toBe(
        "/admin?focusDate=2026-06-15&scheduleRefresh=1",
      );
    });

    it("falls back to refresh-only when lesson date is invalid", () => {
      expect(buildScheduleReturnHref("/instructor", "bad-date")).toBe(
        "/instructor?scheduleRefresh=1",
      );
    });
  });
});
