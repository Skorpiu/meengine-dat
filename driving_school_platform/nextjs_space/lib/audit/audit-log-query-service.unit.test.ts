import { describe, expect, it, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findManyMock = vi.fn();
  return {
    findManyMock,
    prismaMock: {
      auditLog: { findMany: findManyMock },
    },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
  db: h.prismaMock,
}));

import {
  listTenantAuditLogs,
  mapAuditLogRowToListItem,
} from "./audit-log-query-service";
import { encodeAuditLogListCursor } from "./audit-log-query-params";

const baseRow = {
  id: "audit-1",
  createdAt: new Date("2026-06-10T10:00:00.000Z"),
  action: "lesson.create",
  entityType: "Lesson",
  entityId: "lesson-1",
  actorUserId: "admin-1",
  actorRole: "SUPER_ADMIN" as const,
  actorEmail: "admin@school.test",
  userId: null,
  userRole: null,
  userEmail: null,
  targetUserId: null,
  requestId: "req-1",
  metadata: { lessonType: "DRIVING", token: "secret" },
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("mapAuditLogRowToListItem", () => {
  it("maps actor fields and redacts sensitive metadata keys", () => {
    const item = mapAuditLogRowToListItem(baseRow);
    expect(item).toMatchObject({
      id: "audit-1",
      action: "lesson.create",
      entityType: "Lesson",
      entityId: "lesson-1",
      actorUserId: "admin-1",
      actorRole: "SUPER_ADMIN",
      actorEmail: "admin@school.test",
      requestId: "req-1",
    });
    expect(item.metadata).toMatchObject({
      lessonType: "DRIVING",
      token: "[REDACTED]",
    });
    expect(item).not.toHaveProperty("organizationId");
    expect(item).not.toHaveProperty("ipAddress");
    expect(item).not.toHaveProperty("userAgent");
  });

  it("falls back to legacy userId fields when actor fields are null", () => {
    const item = mapAuditLogRowToListItem({
      ...baseRow,
      actorUserId: null,
      actorRole: null,
      actorEmail: null,
      userId: "legacy-admin",
      userRole: "SUPER_ADMIN",
      userEmail: "legacy@school.test",
    });
    expect(item.actorUserId).toBe("legacy-admin");
    expect(item.actorRole).toBe("SUPER_ADMIN");
    expect(item.actorEmail).toBe("legacy@school.test");
  });
});

describe("listTenantAuditLogs", () => {
  it("scopes by organizationId and applies default limit", async () => {
    h.findManyMock.mockResolvedValue([baseRow]);

    const result = await listTenantAuditLogs({
      organizationId: "org-a",
      query: { limit: 50 },
    });

    expect(result.items).toHaveLength(1);
    expect(result.limit).toBe(50);
    expect(result.nextCursor).toBeNull();
    expect(h.findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ organizationId: "org-a" }] },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 51,
      }),
    );
  });

  it("applies action filter", async () => {
    h.findManyMock.mockResolvedValue([]);

    await listTenantAuditLogs({
      organizationId: "org-a",
      query: { limit: 50, action: "student.create" },
    });

    expect(h.findManyMock.mock.calls[0]?.[0].where.AND).toEqual(
      expect.arrayContaining([
        { organizationId: "org-a" },
        { action: "student.create" },
      ]),
    );
  });

  it("applies entity filters", async () => {
    h.findManyMock.mockResolvedValue([]);

    await listTenantAuditLogs({
      organizationId: "org-a",
      query: {
        limit: 50,
        entityType: "Lesson",
        entityId: "lesson-1",
      },
    });

    expect(h.findManyMock.mock.calls[0]?.[0].where.AND).toEqual(
      expect.arrayContaining([
        { entityType: "Lesson" },
        { entityId: "lesson-1" },
      ]),
    );
  });

  it("applies actor and request filters", async () => {
    h.findManyMock.mockResolvedValue([]);

    await listTenantAuditLogs({
      organizationId: "org-a",
      query: {
        limit: 50,
        actorUserId: "admin-1",
        targetUserId: "user-2",
        requestId: "req-9",
      },
    });

    expect(h.findManyMock.mock.calls[0]?.[0].where.AND).toEqual(
      expect.arrayContaining([
        { actorUserId: "admin-1" },
        { targetUserId: "user-2" },
        { requestId: "req-9" },
      ]),
    );
  });

  it("applies date range filters", async () => {
    h.findManyMock.mockResolvedValue([]);

    await listTenantAuditLogs({
      organizationId: "org-a",
      query: {
        limit: 50,
        dateFrom: "2026-06-01T00:00:00.000Z",
        dateTo: "2026-06-30T23:59:59.000Z",
      },
    });

    expect(h.findManyMock.mock.calls[0]?.[0].where.AND).toEqual(
      expect.arrayContaining([
        { createdAt: { gte: new Date("2026-06-01T00:00:00.000Z") } },
        { createdAt: { lte: new Date("2026-06-30T23:59:59.000Z") } },
      ]),
    );
  });

  it("applies stable composite cursor pagination", async () => {
    const row1 = { ...baseRow, id: "audit-2" };
    const row2 = { ...baseRow, id: "audit-1" };
    h.findManyMock.mockResolvedValue([row1, row2]);

    const result = await listTenantAuditLogs({
      organizationId: "org-a",
      query: {
        limit: 1,
        cursor: encodeAuditLogListCursor({
          createdAt: "2026-06-10T10:00:00.000Z",
          id: "audit-3",
        }),
      },
    });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe(
      encodeAuditLogListCursor({
        createdAt: row1.createdAt.toISOString(),
        id: row1.id,
      }),
    );
    expect(h.findManyMock.mock.calls[0]?.[0].where.AND).toEqual(
      expect.arrayContaining([
        {
          OR: [
            { createdAt: { lt: new Date("2026-06-10T10:00:00.000Z") } },
            {
              createdAt: new Date("2026-06-10T10:00:00.000Z"),
              id: { lt: "audit-3" },
            },
          ],
        },
      ]),
    );
  });
});
