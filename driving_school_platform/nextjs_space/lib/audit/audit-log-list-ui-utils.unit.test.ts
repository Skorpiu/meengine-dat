import { describe, it, expect } from "vitest";
import {
  AUDIT_LOG_METADATA_SUMMARY_MAX_LENGTH,
  auditLogListItemHasForbiddenFields,
  formatAuditLogActorLabel,
  formatAuditLogDateTime,
  formatAuditLogMetadataSummary,
  formatAuditLogNullable,
} from "./audit-log-list-ui-utils";

describe("formatAuditLogActorLabel", () => {
  it("prefers actor email over role and user id", () => {
    expect(
      formatAuditLogActorLabel({
        actorEmail: "admin@school.test",
        actorRole: "SUPER_ADMIN",
        actorUserId: "admin-1",
      }),
    ).toBe("admin@school.test");
  });

  it("falls back to role then user id", () => {
    expect(
      formatAuditLogActorLabel({
        actorEmail: null,
        actorRole: "SUPER_ADMIN",
        actorUserId: "admin-1",
      }),
    ).toBe("SUPER_ADMIN");
    expect(
      formatAuditLogActorLabel({
        actorEmail: null,
        actorRole: null,
        actorUserId: "admin-1",
      }),
    ).toBe("admin-1");
  });
});

describe("formatAuditLogMetadataSummary", () => {
  it("serializes metadata and truncates long payloads", () => {
    const long = { note: "x".repeat(200) };
    const summary = formatAuditLogMetadataSummary(long);
    expect(summary.endsWith("…")).toBe(true);
    expect(summary.length).toBe(AUDIT_LOG_METADATA_SUMMARY_MAX_LENGTH + 1);
  });

  it("returns dash for null metadata", () => {
    expect(formatAuditLogMetadataSummary(null)).toBe("—");
  });

  it("serializes object metadata", () => {
    expect(formatAuditLogMetadataSummary({ lessonType: "DRIVING" })).toBe(
      '{"lessonType":"DRIVING"}',
    );
  });
});

describe("formatAuditLogDateTime", () => {
  it("formats valid ISO timestamps", () => {
    expect(formatAuditLogDateTime("2026-06-10T10:00:00.000Z")).not.toBe(
      "2026-06-10T10:00:00.000Z",
    );
  });
});

describe("formatAuditLogNullable", () => {
  it("returns dash for empty values", () => {
    expect(formatAuditLogNullable(null)).toBe("—");
    expect(formatAuditLogNullable("  ")).toBe("—");
    expect(formatAuditLogNullable("req-1")).toBe("req-1");
  });
});

describe("auditLogListItemHasForbiddenFields", () => {
  it("detects forbidden response fields", () => {
    expect(
      auditLogListItemHasForbiddenFields({
        id: "audit-1",
        organizationId: "org-b",
      }),
    ).toBe(true);
    expect(
      auditLogListItemHasForbiddenFields({
        id: "audit-1",
        action: "lesson.create",
      }),
    ).toBe(false);
  });
});
