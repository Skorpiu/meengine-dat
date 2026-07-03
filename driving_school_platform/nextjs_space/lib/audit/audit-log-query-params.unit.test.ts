import { describe, expect, it } from "vitest";
import {
  AUDIT_LOG_LIST_DEFAULT_LIMIT,
  AUDIT_LOG_LIST_MAX_LIMIT,
  decodeAuditLogListCursor,
  encodeAuditLogListCursor,
  parseAuditLogListQueryFromSearchParams,
} from "./audit-log-query-params";

describe("auditLogListQuerySchema via parseAuditLogListQueryFromSearchParams", () => {
  it("applies default limit when omitted", () => {
    const parsed = parseAuditLogListQueryFromSearchParams(
      new URLSearchParams(),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.limit).toBe(AUDIT_LOG_LIST_DEFAULT_LIMIT);
    }
  });

  it("accepts limit up to max", () => {
    const parsed = parseAuditLogListQueryFromSearchParams(
      new URLSearchParams({ limit: String(AUDIT_LOG_LIST_MAX_LIMIT) }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.limit).toBe(AUDIT_LOG_LIST_MAX_LIMIT);
    }
  });

  it("rejects limit above max", () => {
    const parsed = parseAuditLogListQueryFromSearchParams(
      new URLSearchParams({ limit: "101" }),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error).toBe("limit_out_of_range");
    }
  });

  it("rejects invalid limit", () => {
    const parsed = parseAuditLogListQueryFromSearchParams(
      new URLSearchParams({ limit: "0" }),
    );
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid dateFrom", () => {
    const parsed = parseAuditLogListQueryFromSearchParams(
      new URLSearchParams({ dateFrom: "not-a-date" }),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error).toBe("invalid_date");
    }
  });

  it("rejects date range when dateFrom is after dateTo", () => {
    const parsed = parseAuditLogListQueryFromSearchParams(
      new URLSearchParams({
        dateFrom: "2026-06-10T00:00:00.000Z",
        dateTo: "2026-06-01T00:00:00.000Z",
      }),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error).toBe("date_range_invalid");
    }
  });

  it("rejects invalid cursor", () => {
    const parsed = parseAuditLogListQueryFromSearchParams(
      new URLSearchParams({ cursor: "not-valid" }),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error).toBe("invalid_cursor");
    }
  });

  it("parses safe filters", () => {
    const parsed = parseAuditLogListQueryFromSearchParams(
      new URLSearchParams({
        action: "lesson.create",
        entityType: "Lesson",
        entityId: "lesson-1",
        actorUserId: "admin-1",
        targetUserId: "user-2",
        requestId: "req-1",
        dateFrom: "2026-06-01",
        dateTo: "2026-06-30T23:59:59.000Z",
      }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toMatchObject({
        action: "lesson.create",
        entityType: "Lesson",
        entityId: "lesson-1",
        actorUserId: "admin-1",
        targetUserId: "user-2",
        requestId: "req-1",
      });
    }
  });
});

describe("audit log list cursor codec", () => {
  it("round-trips createdAt + id", () => {
    const cursor = {
      createdAt: "2026-06-01T12:00:00.000Z",
      id: "audit-row-1",
    };
    const encoded = encodeAuditLogListCursor(cursor);
    expect(decodeAuditLogListCursor(encoded)).toEqual(cursor);
  });
});
