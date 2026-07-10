/**
 * Tenant-scoped read-only audit log listing (Prisma only).
 * Callers handle HTTP auth, validation, and tenant host guard.
 */
import { prisma } from "@/lib/db";
import { redactAuditMetadata } from "@/lib/audit/audit-log-redaction";
import {
  AUDIT_LOG_LIST_MAX_LIMIT,
  decodeAuditLogListCursor,
  encodeAuditLogListCursor,
  type AuditLogExportQuery,
  type AuditLogListQuery,
} from "@/lib/audit/audit-log-query-params";
import type { Prisma, UserRole } from "@prisma/client";

const AUDIT_LOG_LIST_SELECT = {
  id: true,
  createdAt: true,
  action: true,
  entityType: true,
  entityId: true,
  actorUserId: true,
  actorRole: true,
  actorEmail: true,
  userId: true,
  userRole: true,
  userEmail: true,
  targetUserId: true,
  requestId: true,
  metadata: true,
} satisfies Prisma.AuditLogSelect;

type AuditLogListRow = Prisma.AuditLogGetPayload<{
  select: typeof AUDIT_LOG_LIST_SELECT;
}>;

export type AuditLogListItemDto = {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorUserId: string | null;
  actorRole: UserRole | null;
  actorEmail: string | null;
  targetUserId: string | null;
  requestId: string | null;
  metadata: unknown;
};

export type AuditLogListResult = {
  items: AuditLogListItemDto[];
  nextCursor: string | null;
  limit: number;
};

export const AUDIT_LOG_EXPORT_MAX_ROWS = 10_000;
export const AUDIT_LOG_EXPORT_PAGE_SIZE = AUDIT_LOG_LIST_MAX_LIMIT;

export type AuditLogExportResult = {
  items: AuditLogListItemDto[];
  exportedCount: number;
  truncated: boolean;
  maxRows: number;
};

export function mapAuditLogRowToListItem(
  row: AuditLogListRow,
): AuditLogListItemDto {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    actorUserId: row.actorUserId ?? row.userId,
    actorRole: row.actorRole ?? row.userRole,
    actorEmail: row.actorEmail ?? row.userEmail,
    targetUserId: row.targetUserId,
    requestId: row.requestId,
    metadata:
      row.metadata === null || row.metadata === undefined
        ? null
        : redactAuditMetadata(row.metadata),
  };
}

function buildAuditLogListWhere(input: {
  organizationId: string;
  query: AuditLogListQuery;
}): Prisma.AuditLogWhereInput {
  const { organizationId, query } = input;
  const and: Prisma.AuditLogWhereInput[] = [{ organizationId }];

  if (query.action) {
    and.push({ action: query.action });
  }
  if (query.entityType) {
    and.push({ entityType: query.entityType });
  }
  if (query.entityId) {
    and.push({ entityId: query.entityId });
  }
  if (query.actorUserId) {
    and.push({ actorUserId: query.actorUserId });
  }
  if (query.targetUserId) {
    and.push({ targetUserId: query.targetUserId });
  }
  if (query.requestId) {
    and.push({ requestId: query.requestId });
  }
  if (query.dateFrom) {
    and.push({ createdAt: { gte: new Date(query.dateFrom) } });
  }
  if (query.dateTo) {
    and.push({ createdAt: { lte: new Date(query.dateTo) } });
  }

  if (query.cursor) {
    const decoded = decodeAuditLogListCursor(query.cursor);
    if (decoded) {
      const createdAt = new Date(decoded.createdAt);
      and.push({
        OR: [
          { createdAt: { lt: createdAt } },
          {
            createdAt,
            id: { lt: decoded.id },
          },
        ],
      });
    }
  }

  return { AND: and };
}

export async function listTenantAuditLogs(input: {
  organizationId: string;
  query: AuditLogListQuery;
}): Promise<AuditLogListResult> {
  const limit = input.query.limit;
  const where = buildAuditLogListWhere(input);

  const rows = await prisma.auditLog.findMany({
    where,
    select: AUDIT_LOG_LIST_SELECT,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];

  const nextCursor =
    hasMore && last
      ? encodeAuditLogListCursor({
          createdAt: last.createdAt.toISOString(),
          id: last.id,
        })
      : null;

  return {
    items: page.map(mapAuditLogRowToListItem),
    nextCursor,
    limit,
  };
}

export async function exportTenantAuditLogs(input: {
  organizationId: string;
  filters: AuditLogExportQuery;
  maxRows?: number;
}): Promise<AuditLogExportResult> {
  const maxRows = input.maxRows ?? AUDIT_LOG_EXPORT_MAX_ROWS;
  const items: AuditLogListItemDto[] = [];
  let cursor: string | undefined;
  let truncated = false;

  while (items.length < maxRows) {
    const page = await listTenantAuditLogs({
      organizationId: input.organizationId,
      query: {
        ...input.filters,
        limit: AUDIT_LOG_EXPORT_PAGE_SIZE,
        cursor,
      },
    });

    if (page.items.length === 0) {
      break;
    }

    const remaining = maxRows - items.length;
    const slice = page.items.slice(0, remaining);
    items.push(...slice);

    if (slice.length < page.items.length) {
      truncated = true;
      break;
    }

    if (!page.nextCursor) {
      break;
    }

    cursor = page.nextCursor;
  }

  return {
    items,
    exportedCount: items.length,
    truncated,
    maxRows,
  };
}
