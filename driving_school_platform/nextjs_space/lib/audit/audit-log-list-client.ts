/**
 * Client-side helpers for GET /api/admin/audit-logs (read-only list).
 */

export const AUDIT_LOG_LIST_API_PATH = "/api/admin/audit-logs";

export const AUDIT_LOG_LIST_DEFAULT_LIMIT = 50;

export type AuditLogListItem = {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorUserId: string | null;
  actorRole: string | null;
  actorEmail: string | null;
  targetUserId: string | null;
  requestId: string | null;
  metadata: unknown;
};

export type AuditLogListFilters = {
  action?: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  targetUserId?: string;
  requestId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type AuditLogListResponse = {
  items: AuditLogListItem[];
  nextCursor: string | null;
  limit: number;
};

const FORBIDDEN_AUDIT_LOG_LIST_KEYS = new Set([
  "organizationId",
  "ipAddress",
  "userAgent",
  "oldValues",
  "newValues",
]);

function appendFilterParam(
  params: URLSearchParams,
  key: keyof AuditLogListFilters,
  value: string | undefined,
) {
  const trimmed = value?.trim();
  if (trimmed) {
    params.set(key, trimmed);
  }
}

export function buildAuditLogListUrl(input?: {
  limit?: number;
  cursor?: string;
  filters?: AuditLogListFilters;
}): string {
  const params = new URLSearchParams();
  const limit = input?.limit ?? AUDIT_LOG_LIST_DEFAULT_LIMIT;
  params.set("limit", String(limit));

  const cursor = input?.cursor?.trim();
  if (cursor) {
    params.set("cursor", cursor);
  }

  const filters = input?.filters;
  if (filters) {
    appendFilterParam(params, "action", filters.action);
    appendFilterParam(params, "entityType", filters.entityType);
    appendFilterParam(params, "entityId", filters.entityId);
    appendFilterParam(params, "actorUserId", filters.actorUserId);
    appendFilterParam(params, "targetUserId", filters.targetUserId);
    appendFilterParam(params, "requestId", filters.requestId);
    appendFilterParam(params, "dateFrom", filters.dateFrom);
    appendFilterParam(params, "dateTo", filters.dateTo);
  }

  return `${AUDIT_LOG_LIST_API_PATH}?${params.toString()}`;
}

export function sanitizeAuditLogListItem(
  raw: Record<string, unknown>,
): AuditLogListItem {
  for (const key of FORBIDDEN_AUDIT_LOG_LIST_KEYS) {
    if (key in raw) {
      delete raw[key];
    }
  }

  return {
    id: String(raw.id ?? ""),
    createdAt: String(raw.createdAt ?? ""),
    action: String(raw.action ?? ""),
    entityType: String(raw.entityType ?? ""),
    entityId:
      raw.entityId === null || raw.entityId === undefined
        ? null
        : String(raw.entityId),
    actorUserId:
      raw.actorUserId === null || raw.actorUserId === undefined
        ? null
        : String(raw.actorUserId),
    actorRole:
      raw.actorRole === null || raw.actorRole === undefined
        ? null
        : String(raw.actorRole),
    actorEmail:
      raw.actorEmail === null || raw.actorEmail === undefined
        ? null
        : String(raw.actorEmail),
    targetUserId:
      raw.targetUserId === null || raw.targetUserId === undefined
        ? null
        : String(raw.targetUserId),
    requestId:
      raw.requestId === null || raw.requestId === undefined
        ? null
        : String(raw.requestId),
    metadata: raw.metadata ?? null,
  };
}

export type FetchAuditLogListResult =
  | { ok: true; data: AuditLogListResponse }
  | { ok: false; message: string; status?: number };

export async function fetchAuditLogList(input?: {
  limit?: number;
  cursor?: string;
  filters?: AuditLogListFilters;
}): Promise<FetchAuditLogListResult> {
  const url = buildAuditLogListUrl(input);

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return {
      ok: false,
      message:
        "Failed to load audit logs. Check your connection and try again.",
    };
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      ok: false,
      message: response.ok
        ? "Failed to load audit logs."
        : "Failed to load audit logs. Please try again.",
      status: response.status,
    };
  }

  let body: {
    success?: boolean;
    data?: {
      items?: Record<string, unknown>[];
      nextCursor?: string | null;
      limit?: number;
    };
    error?: string;
  };

  try {
    body = (await response.json()) as typeof body;
  } catch {
    return {
      ok: false,
      message: "Failed to load audit logs.",
      status: response.status,
    };
  }

  if (!response.ok) {
    const message =
      typeof body.error === "string" && body.error.trim()
        ? body.error
        : "Failed to load audit logs.";
    return { ok: false, message, status: response.status };
  }

  if (!body.success || !body.data || !Array.isArray(body.data.items)) {
    return { ok: false, message: "Failed to load audit logs." };
  }

  return {
    ok: true,
    data: {
      items: body.data.items.map((item) =>
        sanitizeAuditLogListItem(item as Record<string, unknown>),
      ),
      nextCursor: body.data.nextCursor ?? null,
      limit: body.data.limit ?? AUDIT_LOG_LIST_DEFAULT_LIMIT,
    },
  };
}
