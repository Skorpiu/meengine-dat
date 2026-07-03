import type { AuditLogListItem } from "@/lib/audit/audit-log-list-client";

export const AUDIT_LOG_METADATA_SUMMARY_MAX_LENGTH = 160;

export function formatAuditLogActorLabel(
  item: Pick<AuditLogListItem, "actorEmail" | "actorRole" | "actorUserId">,
): string {
  if (item.actorEmail?.trim()) {
    return item.actorEmail.trim();
  }
  if (item.actorRole) {
    return item.actorRole;
  }
  if (item.actorUserId?.trim()) {
    return item.actorUserId.trim();
  }
  return "—";
}

export function formatAuditLogNullable(value: string | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

export function formatAuditLogDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString();
}

export function formatAuditLogMetadataSummary(
  metadata: unknown,
  maxLength: number = AUDIT_LOG_METADATA_SUMMARY_MAX_LENGTH,
): string {
  if (metadata === null || metadata === undefined) {
    return "—";
  }

  let serialized: string;
  try {
    serialized =
      typeof metadata === "string" ? metadata : JSON.stringify(metadata);
  } catch {
    return "[unavailable]";
  }

  if (!serialized.trim()) {
    return "—";
  }

  if (serialized.length <= maxLength) {
    return serialized;
  }

  return `${serialized.slice(0, maxLength)}…`;
}

export function auditLogListItemHasForbiddenFields(
  item: Record<string, unknown>,
): boolean {
  return (
    "organizationId" in item ||
    "ipAddress" in item ||
    "userAgent" in item ||
    "oldValues" in item ||
    "newValues" in item
  );
}
