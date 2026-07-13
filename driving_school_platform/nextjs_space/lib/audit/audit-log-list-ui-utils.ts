import type { AuditLogListItem } from "@/lib/audit/audit-log-list-client";
import { getUserRoleLabelFromString } from "@/lib/users/user-role-label";

export const AUDIT_LOG_METADATA_SUMMARY_MAX_LENGTH = 160;

export function formatAuditLogActorLabel(
  item: Pick<AuditLogListItem, "actorEmail" | "actorRole" | "actorUserId">,
): string {
  if (item.actorEmail?.trim()) {
    return item.actorEmail.trim();
  }
  if (item.actorRole) {
    return getUserRoleLabelFromString(item.actorRole);
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

export type AuditLogMobileCardField = {
  label: string;
  value: string;
  mono?: boolean;
};

/** Privacy-minimal fields for narrow-viewport audit log cards (same as table columns). */
export function buildAuditLogMobileCardFields(
  item: AuditLogListItem,
): AuditLogMobileCardField[] {
  return [
    { label: "Created", value: formatAuditLogDateTime(item.createdAt) },
    { label: "Action", value: item.action, mono: true },
    { label: "Entity", value: item.entityType },
    {
      label: "Entity ID",
      value: formatAuditLogNullable(item.entityId),
      mono: true,
    },
    { label: "Actor", value: formatAuditLogActorLabel(item) },
    {
      label: "Target user",
      value: formatAuditLogNullable(item.targetUserId),
      mono: true,
    },
    {
      label: "Request ID",
      value: formatAuditLogNullable(item.requestId),
      mono: true,
    },
    {
      label: "Metadata",
      value: formatAuditLogMetadataSummary(item.metadata),
    },
  ];
}
