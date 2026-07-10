import { describe, expect, it } from "vitest";
import {
  AUDIT_LOG_EXPORT_CSV_HEADERS,
  guardCsvInjection,
  mapAuditLogListItemToExportRow,
  serializeAuditLogExportRowsToCsv,
} from "./audit-log-export";
import type { AuditLogListItemDto } from "./audit-log-query-service";

const sampleItem: AuditLogListItemDto = {
  id: "audit-1",
  createdAt: "2026-06-10T10:00:00.000Z",
  action: "lesson.create",
  entityType: "Lesson",
  entityId: "lesson-1",
  actorUserId: "admin-1",
  actorRole: "SUPER_ADMIN",
  actorEmail: "admin@school.test",
  targetUserId: null,
  requestId: "req-1",
  metadata: { lessonType: "DRIVING" },
};

describe("guardCsvInjection", () => {
  it("prefixes formula-like values", () => {
    expect(guardCsvInjection("=1+1")).toBe("'=1+1");
    expect(guardCsvInjection("+351900000000")).toBe("'+351900000000");
    expect(guardCsvInjection("-10")).toBe("'-10");
    expect(guardCsvInjection("@SUM(A1:A2)")).toBe("'@SUM(A1:A2)");
  });

  it("leaves safe values unchanged", () => {
    expect(guardCsvInjection("lesson.create")).toBe("lesson.create");
    expect(guardCsvInjection("admin@school.test")).toBe("admin@school.test");
  });
});

describe("mapAuditLogListItemToExportRow", () => {
  it("maps privacy-minimal DTO fields only", () => {
    const row = mapAuditLogListItemToExportRow(sampleItem);
    expect(row).toEqual({
      id: "audit-1",
      createdAt: "2026-06-10T10:00:00.000Z",
      action: "lesson.create",
      entityType: "Lesson",
      entityId: "lesson-1",
      actorUserId: "admin-1",
      actorRole: "SUPER_ADMIN",
      actorEmail: "admin@school.test",
      targetUserId: "",
      requestId: "req-1",
      metadata: JSON.stringify({ lessonType: "DRIVING" }),
    });
    expect(row).not.toHaveProperty("organizationId");
    expect(row).not.toHaveProperty("ipAddress");
    expect(row).not.toHaveProperty("userAgent");
  });
});

describe("serializeAuditLogExportRowsToCsv", () => {
  it("writes stable headers and escapes commas, quotes, and newlines", () => {
    const csv = serializeAuditLogExportRowsToCsv([
      sampleItem,
      {
        ...sampleItem,
        id: "audit-2",
        action: "=1+1",
        metadata: { text: "line1\nline2" },
      },
    ]);

    const lines = csv.split("\n");
    expect(lines[0]).toBe(AUDIT_LOG_EXPORT_CSV_HEADERS.join(";"));
    expect(lines[1]).toContain("lesson.create");
    expect(lines[2]).toContain("'=1+1");
    expect(lines[2]).toContain('""text"":""line1\\nline2""');
  });

  it("returns header-only CSV for empty input", () => {
    expect(serializeAuditLogExportRowsToCsv([])).toBe(
      AUDIT_LOG_EXPORT_CSV_HEADERS.join(";"),
    );
  });
});
