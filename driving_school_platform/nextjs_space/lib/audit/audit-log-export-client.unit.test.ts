import { describe, expect, it } from "vitest";
import {
  AUDIT_LOG_EXPORT_API_PATH,
  buildAuditLogExportUrl,
} from "./audit-log-export-client";

describe("buildAuditLogExportUrl", () => {
  it("builds export URL without filters", () => {
    expect(buildAuditLogExportUrl()).toBe(AUDIT_LOG_EXPORT_API_PATH);
  });

  it("includes active viewer filters", () => {
    expect(
      buildAuditLogExportUrl({
        action: "lesson.create",
        entityType: "Lesson",
        entityId: "lesson-1",
        actorUserId: "admin-1",
        targetUserId: "user-2",
        requestId: "req-1",
        dateFrom: "2026-06-01",
        dateTo: "2026-06-30",
      }),
    ).toBe(
      `${AUDIT_LOG_EXPORT_API_PATH}?action=lesson.create&entityType=Lesson&entityId=lesson-1&actorUserId=admin-1&targetUserId=user-2&requestId=req-1&dateFrom=2026-06-01&dateTo=2026-06-30`,
    );
  });

  it("omits empty filter values", () => {
    expect(
      buildAuditLogExportUrl({
        action: "   ",
        entityType: "",
      }),
    ).toBe(AUDIT_LOG_EXPORT_API_PATH);
  });
});
