import { describe, it, expect, vi } from "vitest";
import {
  AUDIT_LOG_LIST_API_PATH,
  AUDIT_LOG_LIST_DEFAULT_LIMIT,
  buildAuditLogListUrl,
  sanitizeAuditLogListItem,
} from "./audit-log-list-client";

describe("buildAuditLogListUrl", () => {
  it("builds default list URL", () => {
    expect(buildAuditLogListUrl()).toBe(
      `${AUDIT_LOG_LIST_API_PATH}?limit=${AUDIT_LOG_LIST_DEFAULT_LIMIT}`,
    );
  });

  it("includes cursor and filters", () => {
    expect(
      buildAuditLogListUrl({
        cursor: "cursor-1",
        filters: {
          action: "lesson.create",
          entityType: "Lesson",
          entityId: "lesson-1",
          actorUserId: "admin-1",
          targetUserId: "user-2",
          requestId: "req-1",
          dateFrom: "2026-06-01",
          dateTo: "2026-06-30",
        },
      }),
    ).toBe(
      `${AUDIT_LOG_LIST_API_PATH}?limit=${AUDIT_LOG_LIST_DEFAULT_LIMIT}&cursor=cursor-1&action=lesson.create&entityType=Lesson&entityId=lesson-1&actorUserId=admin-1&targetUserId=user-2&requestId=req-1&dateFrom=2026-06-01&dateTo=2026-06-30`,
    );
  });

  it("omits empty filter values", () => {
    expect(
      buildAuditLogListUrl({
        filters: {
          action: "   ",
          entityType: "",
        },
      }),
    ).toBe(`${AUDIT_LOG_LIST_API_PATH}?limit=${AUDIT_LOG_LIST_DEFAULT_LIMIT}`);
  });
});

describe("sanitizeAuditLogListItem", () => {
  it("maps allowed fields and strips forbidden keys", () => {
    const item = sanitizeAuditLogListItem({
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
      organizationId: "org-b",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0",
      oldValues: { status: "OLD" },
      newValues: { status: "NEW" },
    });

    expect(item).toEqual({
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
    });
    expect(item).not.toHaveProperty("organizationId");
    expect(item).not.toHaveProperty("ipAddress");
    expect(item).not.toHaveProperty("userAgent");
  });
});

describe("fetchAuditLogList", () => {
  it("returns parsed list data on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: "audit-1",
                createdAt: "2026-06-10T10:00:00.000Z",
                action: "student.create",
                entityType: "Student",
                entityId: "stu-1",
                actorUserId: "admin-1",
                actorRole: "SUPER_ADMIN",
                actorEmail: null,
                targetUserId: null,
                requestId: null,
                metadata: null,
              },
            ],
            nextCursor: "next-1",
            limit: 50,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { fetchAuditLogList } = await import("./audit-log-list-client");
    const result = await fetchAuditLogList({
      filters: { action: "student.create" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items).toHaveLength(1);
      expect(result.data.nextCursor).toBe("next-1");
    }
    expect(fetchMock).toHaveBeenCalledWith(
      `${AUDIT_LOG_LIST_API_PATH}?limit=50&action=student.create`,
    );

    vi.unstubAllGlobals();
  });

  it("returns API error message on 400", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "date_range_invalid" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { fetchAuditLogList } = await import("./audit-log-list-client");
    const result = await fetchAuditLogList({
      filters: {
        dateFrom: "2026-06-10",
        dateTo: "2026-06-01",
      },
    });

    expect(result).toEqual({
      ok: false,
      message: "date_range_invalid",
      status: 400,
    });

    vi.unstubAllGlobals();
  });
});
