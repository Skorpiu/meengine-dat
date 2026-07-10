import { describe, expect, it } from "vitest";
import {
  SMOKE_VIEWPORT_OVERFLOW_TOLERANCE_PX,
  summarizeSmokeAdminAuditLogsPageMarkers,
  summarizeSmokeAdminLessonsPageMarkers,
  summarizeSmokeAdminScheduleMapPageMarkers,
  summarizeSmokeAdminUsersPageMarkers,
  summarizeSmokeAdminVehiclesPageMarkers,
  summarizeSmokeViewportOverflow,
} from "./smoke-viewport-layout";
import { SMOKE_TESTIDS } from "@/lib/smoke/smoke-testids";

describe("summarizeSmokeViewportOverflow", () => {
  it("passes when overflow is within tolerance", () => {
    const result = summarizeSmokeViewportOverflow({
      scrollWidth: 380,
      clientWidth: 375,
      overflowPx: 5,
    });
    expect(result.ok).toBe(true);
    expect(result.detail).toContain("No critical horizontal overflow");
  });

  it("fails when overflow exceeds tolerance", () => {
    const result = summarizeSmokeViewportOverflow(
      { scrollWidth: 420, clientWidth: 375, overflowPx: 45 },
      SMOKE_VIEWPORT_OVERFLOW_TOLERANCE_PX,
    );
    expect(result.ok).toBe(false);
    expect(result.detail).toContain("Critical horizontal overflow");
  });
});

describe("summarizeSmokeAdminLessonsPageMarkers", () => {
  it("prefers lesson management test id", () => {
    const result = summarizeSmokeAdminLessonsPageMarkers({
      lessonManagementTestId: true,
    });
    expect(result.ok).toBe(true);
    expect(result.detail).toContain(SMOKE_TESTIDS.lessonManagement);
  });

  it("fails when no marker is present", () => {
    const result = summarizeSmokeAdminLessonsPageMarkers({});
    expect(result.ok).toBe(false);
    expect(result.detail).toContain("required UI marker not found");
  });
});

describe("summarizeSmokeAdminVehiclesPageMarkers", () => {
  it("prefers vehicle management heading", () => {
    const result = summarizeSmokeAdminVehiclesPageMarkers({
      vehicleManagementHeading: true,
      allVehiclesButton: true,
    });
    expect(result.ok).toBe(true);
    expect(result.detail).toContain("vehicle_management_heading");
  });

  it("fails when no marker is present", () => {
    const result = summarizeSmokeAdminVehiclesPageMarkers({});
    expect(result.ok).toBe(false);
    expect(result.detail).toContain("required UI marker not found");
  });
});

describe("summarizeSmokeAdminAuditLogsPageMarkers", () => {
  it("prefers audit logs heading", () => {
    const result = summarizeSmokeAdminAuditLogsPageMarkers({
      auditLogsHeading: true,
      auditEventsCard: true,
    });
    expect(result.ok).toBe(true);
    expect(result.detail).toContain("audit_logs_heading");
  });

  it("fails when no marker is present", () => {
    const result = summarizeSmokeAdminAuditLogsPageMarkers({});
    expect(result.ok).toBe(false);
  });
});

describe("summarizeSmokeAdminUsersPageMarkers", () => {
  it("prefers people page test id", () => {
    const result = summarizeSmokeAdminUsersPageMarkers({
      peoplePageTestId: true,
      studentsTab: true,
    });
    expect(result.ok).toBe(true);
    expect(result.detail).toContain(SMOKE_TESTIDS.peoplePage);
  });

  it("fails when no marker is present", () => {
    const result = summarizeSmokeAdminUsersPageMarkers({});
    expect(result.ok).toBe(false);
  });
});

describe("summarizeSmokeAdminScheduleMapPageMarkers", () => {
  it("prefers schedule map test id", () => {
    const result = summarizeSmokeAdminScheduleMapPageMarkers({
      scheduleMapTestId: true,
    });
    expect(result.ok).toBe(true);
    expect(result.detail).toContain(SMOKE_TESTIDS.scheduleMap);
  });

  it("fails when no marker is present", () => {
    const result = summarizeSmokeAdminScheduleMapPageMarkers({});
    expect(result.ok).toBe(false);
  });
});
