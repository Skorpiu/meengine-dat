import { describe, expect, it } from "vitest";
import {
  SCHEDULE_MAP_WIDE_VIEW_MIN_WIDTH_PX,
  coerceScheduleMapViewTypeForViewport,
  isScheduleMapWideViewType,
  isScheduleMapWideViewport,
  shouldRenderScheduleMapWideGrid,
} from "./schedule-map-responsive";

describe("schedule-map-responsive", () => {
  describe("isScheduleMapWideViewport", () => {
    it("returns true at lg breakpoint and above", () => {
      expect(
        isScheduleMapWideViewport(SCHEDULE_MAP_WIDE_VIEW_MIN_WIDTH_PX),
      ).toBe(true);
      expect(isScheduleMapWideViewport(1280)).toBe(true);
    });

    it("returns false below lg breakpoint", () => {
      expect(
        isScheduleMapWideViewport(SCHEDULE_MAP_WIDE_VIEW_MIN_WIDTH_PX - 1),
      ).toBe(false);
      expect(isScheduleMapWideViewport(375)).toBe(false);
    });
  });

  describe("isScheduleMapWideViewType", () => {
    it("identifies week and month as wide calendar views", () => {
      expect(isScheduleMapWideViewType("week")).toBe(true);
      expect(isScheduleMapWideViewType("month")).toBe(true);
      expect(isScheduleMapWideViewType("day")).toBe(false);
    });
  });

  describe("shouldRenderScheduleMapWideGrid", () => {
    it("renders week/month grid only on wide viewports", () => {
      expect(shouldRenderScheduleMapWideGrid("week", true)).toBe(true);
      expect(shouldRenderScheduleMapWideGrid("month", true)).toBe(true);
      expect(shouldRenderScheduleMapWideGrid("week", false)).toBe(false);
      expect(shouldRenderScheduleMapWideGrid("month", false)).toBe(false);
    });

    it("never renders a grid for day view", () => {
      expect(shouldRenderScheduleMapWideGrid("day", true)).toBe(false);
      expect(shouldRenderScheduleMapWideGrid("day", false)).toBe(false);
    });
  });

  describe("coerceScheduleMapViewTypeForViewport", () => {
    it("keeps view type on wide viewports", () => {
      expect(coerceScheduleMapViewTypeForViewport("week", true)).toBe("week");
      expect(coerceScheduleMapViewTypeForViewport("month", true)).toBe("month");
      expect(coerceScheduleMapViewTypeForViewport("day", true)).toBe("day");
    });

    it("falls back to day for week/month on narrow viewports", () => {
      expect(coerceScheduleMapViewTypeForViewport("week", false)).toBe("day");
      expect(coerceScheduleMapViewTypeForViewport("month", false)).toBe("day");
      expect(coerceScheduleMapViewTypeForViewport("day", false)).toBe("day");
    });
  });
});
