import type { InvitationDto } from "@/lib/invitations/invitation-dto";
import type { UserRole } from "@prisma/client";
import {
  writeAuditEvent,
  type AuditRequestContext,
  type WriteAuditEventOptions,
} from "@/lib/audit/audit-log-service";

export const INVITATION_AUDIT_ENTITY_TYPE = "UserInvitation";

export type InvitationAuditAction =
  | "invitation.create"
  | "invitation.revoke"
  | "invitation.email.change";

export type InvitationAuditActor = {
  userId: string;
  role: UserRole;
  email?: string | null;
};

export function buildInvitationAuditMetadata(
  invitation: Pick<InvitationDto, "role" | "status" | "studentId">,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    role: invitation.role,
    status: invitation.status,
  };

  if (invitation.studentId) {
    metadata.studentId = invitation.studentId;
  }

  return metadata;
}

export function buildInvitationEmailChangeAuditMetadata(
  invitation: Pick<InvitationDto, "role" | "status" | "studentId">,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    role: invitation.role,
    status: invitation.status,
    emailChanged: true,
    tokenRegenerated: true,
  };

  if (invitation.studentId) {
    metadata.linkedStudentId = invitation.studentId;
  }

  return metadata;
}

type WriteInvitationAuditEventInput = {
  action: InvitationAuditAction;
  organizationId: string;
  actor: InvitationAuditActor;
  invitation: InvitationDto;
  requestContext?: AuditRequestContext;
  options?: WriteAuditEventOptions;
};

/**
 * Persists a tenant-scoped invitation audit event. Never includes tokenHash or invite tokens.
 */
export async function writeInvitationAuditEvent(
  input: WriteInvitationAuditEventInput,
) {
  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: input.action,
      entityType: INVITATION_AUDIT_ENTITY_TYPE,
      entityId: input.invitation.id,
      targetUserId: input.invitation.acceptedUser?.id ?? null,
      metadata: buildInvitationAuditMetadata(input.invitation),
      ...(input.action === "invitation.revoke"
        ? {
            oldValues: { status: "PENDING" },
            newValues: { status: input.invitation.status },
          }
        : {}),
      ...input.requestContext,
    },
    input.options,
  );
}

type WriteInvitationEmailChangeAuditEventInput = {
  organizationId: string;
  actor: InvitationAuditActor;
  invitation: Pick<
    InvitationDto,
    "id" | "role" | "status" | "studentId" | "acceptedUser"
  >;
  requestContext?: AuditRequestContext;
  options?: WriteAuditEventOptions;
};

/**
 * Persists invitation.email.change after a successful pending invite email update.
 * Never logs old/new email, token, tokenHash, or inviteLink.
 */
export async function writeInvitationEmailChangeAuditEvent(
  input: WriteInvitationEmailChangeAuditEventInput,
) {
  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: "invitation.email.change",
      entityType: INVITATION_AUDIT_ENTITY_TYPE,
      entityId: input.invitation.id,
      targetUserId: input.invitation.acceptedUser?.id ?? null,
      metadata: buildInvitationEmailChangeAuditMetadata(input.invitation),
      ...input.requestContext,
    },
    input.options,
  );
}
