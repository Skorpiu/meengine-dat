import type { PatchStudentRecordBody } from "@/lib/students/student-record-validation";
import type { StudentRecordDto } from "@/lib/students/student-record-dto";
import type { UserRole } from "@prisma/client";
import {
  writeAuditEvent,
  type AuditRequestContext,
  type WriteAuditEventOptions,
} from "@/lib/audit/audit-log-service";

export const STUDENT_AUDIT_ENTITY_TYPE = "Student";

export type StudentAppAccessAuditAction =
  | "student.app_access.remove"
  | "student.app_access.reactivate";

export type StudentProfileAuditAction =
  | "student.update"
  | "student.email.change";

export type StudentDeleteAuditAction = "student.delete";

export type StudentInviteAuditAction = "student.invite";

export type StudentCreateAuditAction = "student.create";

export type StudentImportApplyAuditAction = "student.import.apply";

export const STUDENT_IMPORT_AUDIT_ENTITY_TYPE = "StudentImport";

export type StudentEmailChangePolicyMode =
  | "APP_USER"
  | "INVITED"
  | "MANUAL_ONLY";

export type StudentAuditActor = {
  userId: string;
  role: UserRole;
  email?: string | null;
};

type WriteStudentAuditEventBase = {
  organizationId: string;
  actor: StudentAuditActor;
  studentId: string;
  requestContext?: AuditRequestContext;
  options?: WriteAuditEventOptions;
};

export function collectStudentProfileUpdateChangedFields(
  data: PatchStudentRecordBody,
): string[] {
  const fields: string[] = [];

  if (data.firstName !== undefined) {
    fields.push("firstName");
  }
  if (data.lastName !== undefined) {
    fields.push("lastName");
  }
  if (data.phoneNumber !== undefined) {
    fields.push("phoneNumber");
  }
  if (data.address !== undefined) {
    fields.push("address");
  }
  if (data.email !== undefined) {
    fields.push("email");
  }
  if (data.enrollmentDate !== undefined) {
    fields.push("enrollmentDate");
  }
  if (data.yearSuffix !== undefined && data.sequenceNumber !== undefined) {
    fields.push("schoolStudentId");
  }
  if (data.categoryName !== undefined) {
    fields.push("categoryName");
  }
  if (data.transmissionTypeName !== undefined) {
    fields.push("transmissionTypeName");
  }

  return fields;
}

export function buildStudentProfileUpdateAuditMetadata(input: {
  changedFields: string[];
  appAccessMode: string;
}): Record<string, unknown> {
  return {
    changedFields: input.changedFields,
    appAccessMode: input.appAccessMode,
  };
}

export function buildStudentEmailChangeAuditMetadata(input: {
  policyMode: StudentEmailChangePolicyMode;
  hasLinkedUser: boolean;
  invitationRevoked: boolean;
}): Record<string, unknown> {
  return {
    policyMode: input.policyMode,
    hasLinkedUser: input.hasLinkedUser,
    invitationRevoked: input.invitationRevoked,
  };
}

export function buildStudentInviteAuditMetadata(input: {
  invitationRole: string;
  invitationStatus: string;
  previousAppAccessMode: string;
  hasExistingInvitation: boolean;
}): Record<string, unknown> {
  return {
    invitationRole: input.invitationRole,
    invitationStatus: input.invitationStatus,
    previousAppAccessMode: input.previousAppAccessMode,
    appAccessMode: "INVITED",
    hasExistingInvitation: input.hasExistingInvitation,
  };
}

export function buildStudentImportApplyAuditMetadata(input: {
  format: "csv" | "json";
  totalRows: number;
  createdCount: number;
  skippedCount: number;
}): Record<string, unknown> {
  return {
    totalRows: input.totalRows,
    createdCount: input.createdCount,
    updatedCount: 0,
    skippedCount: input.skippedCount,
    failedCount: 0,
    dryRun: false,
    source: "import",
    format: input.format,
    mode: "createOnly",
    hasErrors: false,
  };
}

/**
 * Batch surrogate when the product has no persisted importId.
 * Prefer inbound request correlation headers when present.
 */
export function resolveStudentImportApplyAuditEntityId(
  requestContext?: AuditRequestContext,
): string {
  const requestId = requestContext?.requestId?.trim();
  if (requestId) {
    return requestId;
  }
  return crypto.randomUUID();
}

export function buildStudentCreateAuditMetadata(input: {
  appAccessMode: string;
  hasLicenseCategory: boolean;
  hasTransmissionType: boolean;
  hasEmail: boolean;
  hasAddress: boolean;
  schoolStudentIdPresent: boolean;
  createdVia: "manual";
}): Record<string, unknown> {
  return {
    appAccessMode: input.appAccessMode,
    hasLicenseCategory: input.hasLicenseCategory,
    hasTransmissionType: input.hasTransmissionType,
    hasEmail: input.hasEmail,
    hasAddress: input.hasAddress,
    schoolStudentIdPresent: input.schoolStudentIdPresent,
    createdVia: input.createdVia,
  };
}

export type StudentCreateAuditContext = {
  linkedUserId: string | null;
  appAccessMode: string;
  hasLicenseCategory: boolean;
  hasTransmissionType: boolean;
  hasEmail: boolean;
  hasAddress: boolean;
  schoolStudentIdPresent: boolean;
  createdVia: "manual";
};

export function buildStudentCreateAuditContextFromRecord(
  student: Pick<
    StudentRecordDto,
    | "appAccessMode"
    | "email"
    | "address"
    | "schoolStudentId"
    | "category"
    | "transmissionType"
    | "userId"
  >,
): StudentCreateAuditContext {
  return {
    linkedUserId: student.userId,
    appAccessMode: student.appAccessMode,
    hasLicenseCategory: student.category != null,
    hasTransmissionType: student.transmissionType != null,
    hasEmail: Boolean(student.email?.trim()),
    hasAddress: Boolean(student.address?.trim()),
    schoolStudentIdPresent: Boolean(student.schoolStudentId?.trim()),
    createdVia: "manual",
  };
}

export function buildStudentDeleteAuditMetadata(input: {
  appAccessMode: string;
  hadLinkedUser: boolean;
  hadLessons: boolean;
}): Record<string, unknown> {
  return {
    appAccessMode: input.appAccessMode,
    hadLinkedUser: input.hadLinkedUser,
    hadLessons: input.hadLessons,
  };
}

export function buildStudentAppAccessRemoveAuditMetadata(input: {
  appAccessMode: string;
}): Record<string, unknown> {
  return {
    previousAppAccessMode: "APP_USER",
    appAccessMode: input.appAccessMode,
  };
}

export function buildStudentAppAccessReactivateAuditMetadata(input: {
  appAccessMode: string;
  linkedUserId?: string | null;
}): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    previousAppAccessMode: "MANUAL_ONLY",
    appAccessMode: input.appAccessMode,
  };

  if (input.linkedUserId) {
    metadata.linkedUserId = input.linkedUserId;
  }

  return metadata;
}

export async function writeStudentProfileUpdateAuditEvent(
  input: WriteStudentAuditEventBase & {
    changedFields: string[];
    appAccessMode: string;
    linkedUserId?: string | null;
  },
) {
  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: "student.update",
      entityType: STUDENT_AUDIT_ENTITY_TYPE,
      entityId: input.studentId,
      targetUserId: input.linkedUserId ?? null,
      metadata: buildStudentProfileUpdateAuditMetadata({
        changedFields: input.changedFields,
        appAccessMode: input.appAccessMode,
      }),
      ...input.requestContext,
    },
    input.options,
  );
}

export async function writeStudentEmailChangeAuditEvent(
  input: WriteStudentAuditEventBase & {
    policyMode: StudentEmailChangePolicyMode;
    hasLinkedUser: boolean;
    invitationRevoked: boolean;
    linkedUserId?: string | null;
  },
) {
  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: "student.email.change",
      entityType: STUDENT_AUDIT_ENTITY_TYPE,
      entityId: input.studentId,
      targetUserId: input.linkedUserId ?? null,
      metadata: buildStudentEmailChangeAuditMetadata({
        policyMode: input.policyMode,
        hasLinkedUser: input.hasLinkedUser,
        invitationRevoked: input.invitationRevoked,
      }),
      ...input.requestContext,
    },
    input.options,
  );
}

export async function writeStudentInviteAuditEvent(
  input: WriteStudentAuditEventBase & {
    invitationRole: string;
    invitationStatus: string;
    previousAppAccessMode: string;
  },
) {
  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: "student.invite",
      entityType: STUDENT_AUDIT_ENTITY_TYPE,
      entityId: input.studentId,
      metadata: buildStudentInviteAuditMetadata({
        invitationRole: input.invitationRole,
        invitationStatus: input.invitationStatus,
        previousAppAccessMode: input.previousAppAccessMode,
        hasExistingInvitation: input.previousAppAccessMode === "INVITED",
      }),
      ...input.requestContext,
    },
    input.options,
  );
}

export async function writeStudentCreateAuditEvent(
  input: WriteStudentAuditEventBase & StudentCreateAuditContext,
) {
  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: "student.create",
      entityType: STUDENT_AUDIT_ENTITY_TYPE,
      entityId: input.studentId,
      targetUserId: input.linkedUserId ?? null,
      metadata: buildStudentCreateAuditMetadata({
        appAccessMode: input.appAccessMode,
        hasLicenseCategory: input.hasLicenseCategory,
        hasTransmissionType: input.hasTransmissionType,
        hasEmail: input.hasEmail,
        hasAddress: input.hasAddress,
        schoolStudentIdPresent: input.schoolStudentIdPresent,
        createdVia: input.createdVia,
      }),
      ...input.requestContext,
    },
    input.options,
  );
}

export async function writeStudentDeleteAuditEvent(
  input: WriteStudentAuditEventBase & {
    appAccessMode: string;
    hadLinkedUser: boolean;
    lessonsCount: number;
    linkedUserId?: string | null;
  },
) {
  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: "student.delete",
      entityType: STUDENT_AUDIT_ENTITY_TYPE,
      entityId: input.studentId,
      targetUserId: input.linkedUserId ?? null,
      metadata: buildStudentDeleteAuditMetadata({
        appAccessMode: input.appAccessMode,
        hadLinkedUser: input.hadLinkedUser,
        hadLessons: input.lessonsCount > 0,
      }),
      ...input.requestContext,
    },
    input.options,
  );
}

export async function writeStudentAppAccessRemoveAuditEvent(
  input: WriteStudentAuditEventBase & {
    appAccessMode: string;
  },
) {
  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: "student.app_access.remove",
      entityType: STUDENT_AUDIT_ENTITY_TYPE,
      entityId: input.studentId,
      metadata: buildStudentAppAccessRemoveAuditMetadata({
        appAccessMode: input.appAccessMode,
      }),
      ...input.requestContext,
    },
    input.options,
  );
}

export async function writeStudentImportApplyAuditEvent(input: {
  organizationId: string;
  actor: StudentAuditActor;
  format: "csv" | "json";
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  requestContext?: AuditRequestContext;
  options?: WriteAuditEventOptions;
}) {
  const entityId = resolveStudentImportApplyAuditEntityId(input.requestContext);

  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: "student.import.apply",
      entityType: STUDENT_IMPORT_AUDIT_ENTITY_TYPE,
      entityId,
      metadata: buildStudentImportApplyAuditMetadata({
        format: input.format,
        totalRows: input.totalRows,
        createdCount: input.createdCount,
        skippedCount: input.skippedCount,
      }),
      ...input.requestContext,
    },
    input.options,
  );
}

export async function writeStudentAppAccessReactivateAuditEvent(
  input: WriteStudentAuditEventBase & {
    appAccessMode: string;
    linkedUserId?: string | null;
  },
) {
  return writeAuditEvent(
    {
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      actorEmail: input.actor.email ?? null,
      action: "student.app_access.reactivate",
      entityType: STUDENT_AUDIT_ENTITY_TYPE,
      entityId: input.studentId,
      targetUserId: input.linkedUserId ?? null,
      metadata: buildStudentAppAccessReactivateAuditMetadata({
        appAccessMode: input.appAccessMode,
        linkedUserId: input.linkedUserId,
      }),
      ...input.requestContext,
    },
    input.options,
  );
}
