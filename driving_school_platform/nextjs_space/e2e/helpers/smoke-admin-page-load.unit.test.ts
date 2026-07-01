import { describe, expect, it } from "vitest";
import {
  isSmokeAuthLoginUrl,
  summarizeSmokeAdminLessonsPageMarkers,
  summarizeSmokeAdminScheduleMapPageMarkers,
  summarizeSmokeOptionalUiNavigation,
} from "./smoke-admin-page-load";

describe("summarizeSmokeAdminLessonsPageMarkers", () => {
  it("prefers lessons heading when present", () => {
    const result = summarizeSmokeAdminLessonsPageMarkers({
      lessonsHeading: true,
      drivingTab: true,
    });
    expect(result.ok).toBe(true);
    expect(result.detail).toContain("lessons_heading");
  });

  it("accepts premium feature gate marker", () => {
    const result = summarizeSmokeAdminLessonsPageMarkers({
      premiumFeatureGate: true,
    });
    expect(result.ok).toBe(true);
    expect(result.detail).toContain("premium_feature_gate");
  });

  it("warns and passes when no marker is present", () => {
    const result = summarizeSmokeAdminLessonsPageMarkers({});
    expect(result.ok).toBe(true);
    expect(result.detail).toContain("WARN:");
    expect(result.detail).toContain("API fixture preflight");
  });
});

describe("summarizeSmokeOptionalUiNavigation", () => {
  it("returns WARN on navigation timeout without throwing", () => {
    const result = summarizeSmokeOptionalUiNavigation(
      "Schedule Map",
      new Error("page.goto: Test timeout of 15000ms exceeded"),
    );
    expect(result.ok).toBe(true);
    expect(result.detail).toContain("WARN:");
    expect(result.detail).toContain("navigation timed out");
    expect(result.detail).toContain("API-authoritative");
  });

  it("returns WARN on generic navigation failure", () => {
    const result = summarizeSmokeOptionalUiNavigation(
      "Admin lessons",
      new Error("net::ERR_CONNECTION_RESET"),
    );
    expect(result.ok).toBe(true);
    expect(result.detail).toContain("WARN:");
    expect(result.detail).toContain("navigation failed");
  });
});

describe("summarizeSmokeAdminScheduleMapPageMarkers", () => {
  it("passes when lesson start time marker is visible", () => {
    const result = summarizeSmokeAdminScheduleMapPageMarkers(
      { lessonStartTimeVisible: true, scheduleMapLabel: true },
      "10:00",
    );
    expect(result.ok).toBe(true);
    expect(result.detail).toContain("lesson_start_time_visible:10:00");
  });

  it("warns when start time is missing but navigation succeeded", () => {
    const result = summarizeSmokeAdminScheduleMapPageMarkers(
      { scheduleMapLabel: true },
      "10:15",
    );
    expect(result.ok).toBe(true);
    expect(result.detail).toContain("WARN:");
    expect(result.detail).toContain("10:15");
    expect(result.detail).toContain("API-authoritative");
  });
});

describe("isSmokeAuthLoginUrl", () => {
  it("detects login redirect URLs", () => {
    expect(isSmokeAuthLoginUrl("https://www.meengine.io/auth/login")).toBe(
      true,
    );
    expect(isSmokeAuthLoginUrl("https://www.meengine.io/auth/login?x=1")).toBe(
      true,
    );
    expect(isSmokeAuthLoginUrl("https://www.meengine.io/admin")).toBe(false);
  });
});
