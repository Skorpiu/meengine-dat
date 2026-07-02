import { prisma } from "@/lib/db";
import { getClientIpFromRequest } from "@/lib/rate-limit/client-ip";
import type { AuditStatus, Prisma, UserRole } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";
import { redactAuditMetadata } from "@/lib/audit/audit-log-redaction";

export type AuditRequestContext = {
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestMethod?: string | null;
  requestPath?: string | null;
};

export type AuditActorContext = {
  actorUserId?: string | null;
  actorRole?: UserRole | null;
  actorEmail?: string | null;
};

export type WriteAuditEventInput = AuditActorContext &
  AuditRequestContext & {
    /** Tenant scope from session/host guard — never from request body. NULL = platform-scoped. */
    organizationId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    targetUserId?: string | null;
    metadata?: unknown;
    oldValues?: unknown;
    newValues?: unknown;
    status?: AuditStatus;
    errorMessage?: string | null;
  };

export type WriteAuditEventOptions = {
  db?: Prisma.TransactionClient;
  throwOnError?: boolean;
};

function toPrismaJsonField(
  value: unknown,
): Prisma.InputJsonValue | typeof PrismaNamespace.JsonNull {
  if (value === null) {
    return PrismaNamespace.JsonNull;
  }
  return value as Prisma.InputJsonValue;
}

function normalizeOptionalString(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function assertAuditLabel(
  field: "action" | "entityType",
  value: string,
): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`audit_${field}_required`);
  }
  if (trimmed.length > 128) {
    throw new Error(`audit_${field}_too_long`);
  }
  return trimmed;
}

/**
 * Maps caller input to Prisma create data, including legacy userId/userEmail/userRole fields.
 */
export function buildAuditLogCreateData(
  input: WriteAuditEventInput,
): Prisma.AuditLogUncheckedCreateInput {
  const action = assertAuditLabel("action", input.action);
  const entityType = assertAuditLabel("entityType", input.entityType);

  const actorUserId = normalizeOptionalString(input.actorUserId ?? undefined);
  const actorEmail = normalizeOptionalString(input.actorEmail ?? undefined);
  const actorRole = input.actorRole ?? null;

  const metadata =
    input.metadata === undefined
      ? undefined
      : redactAuditMetadata(input.metadata);
  const oldValues =
    input.oldValues === undefined
      ? undefined
      : redactAuditMetadata(input.oldValues);
  const newValues =
    input.newValues === undefined
      ? undefined
      : redactAuditMetadata(input.newValues);

  const data: Prisma.AuditLogUncheckedCreateInput = {
    organizationId: normalizeOptionalString(input.organizationId ?? undefined),
    actorUserId,
    actorRole,
    actorEmail,
    userId: actorUserId,
    userEmail: actorEmail,
    userRole: actorRole,
    targetUserId: normalizeOptionalString(input.targetUserId ?? undefined),
    action,
    entityType,
    entityId: normalizeOptionalString(input.entityId ?? undefined),
    requestId: normalizeOptionalString(input.requestId ?? undefined),
    ipAddress: normalizeOptionalString(input.ipAddress ?? undefined),
    userAgent: normalizeOptionalString(input.userAgent ?? undefined),
    requestMethod: normalizeOptionalString(input.requestMethod ?? undefined),
    requestPath: normalizeOptionalString(input.requestPath ?? undefined),
    status: input.status ?? "SUCCESS",
    errorMessage: normalizeOptionalString(input.errorMessage ?? undefined),
  };

  if (metadata !== undefined) {
    data.metadata = toPrismaJsonField(metadata);
  }
  if (oldValues !== undefined) {
    data.oldValues = toPrismaJsonField(oldValues);
  }
  if (newValues !== undefined) {
    data.newValues = toPrismaJsonField(newValues);
  }

  return data;
}

/**
 * Extracts optional request correlation fields from an incoming Request.
 * Does not read organizationId from headers — tenant scope must come from session.
 */
export function extractAuditRequestContext(
  request: Request,
): AuditRequestContext {
  const requestId =
    request.headers.get("x-request-id") ??
    request.headers.get("x-correlation-id") ??
    request.headers.get("x-vercel-id");

  return {
    requestId: normalizeOptionalString(requestId ?? undefined),
    ipAddress: getClientIpFromRequest(request),
    userAgent: normalizeOptionalString(
      request.headers.get("user-agent") ?? undefined,
    ),
    requestMethod: normalizeOptionalString(request.method),
    requestPath: normalizeOptionalString(new URL(request.url).pathname),
  };
}

/**
 * Persists a tenant-aware audit event. Failures are logged by default and do not
 * block the caller mutation unless `throwOnError` is set.
 */
export async function writeAuditEvent(
  input: WriteAuditEventInput,
  options: WriteAuditEventOptions = {},
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const client = options.db ?? prisma;

  try {
    const data = buildAuditLogCreateData(input);
    const row = await client.auditLog.create({ data });
    return { ok: true, id: row.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "audit_log_write_failed";

    if (options.throwOnError) {
      throw error;
    }

    console.error("[audit-log] write failed:", message);
    return { ok: false, error: message };
  }
}
