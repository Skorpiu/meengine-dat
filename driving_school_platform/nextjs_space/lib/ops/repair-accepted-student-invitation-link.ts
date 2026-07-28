/**
 * Operator-safe repair: set UserInvitation.studentId on a coherent ACCEPTED
 * STUDENT invite for DAT Production Smoke when the Student profile already exists.
 *
 * Dry-run by default. Writes only when apply=true.
 * Never accepts email via argv. Never prints full emails or full IDs.
 */

import { buildAuditLogCreateData } from "@/lib/audit/audit-log-service";
import { redactEmailRecipient } from "@/lib/email/redaction";
import { normalizeInvitationEmail } from "@/lib/invitations/invitation-policy";
import { DAT_SMOKE_INVITED_STUDENT_EMAIL_ENV } from "@/lib/ops/production-smoke-fixtures-canonical";
import {
  CANONICAL_SMOKE_ORGANIZATION_NAME,
  toSafeIdPrefix,
  type SafeIdPrefix,
} from "@/lib/ops/production-smoke-reconciliation-inspection";

export const REPAIR_ACCEPTED_STUDENT_INVITATION_LINK_AUDIT_ACTION =
  "invitation.student_link.repair";

export type RepairAcceptedStudentInvitationLinkDb = {
  organization: {
    findMany: (args: {
      where?: { name?: string | { not: string } };
      select: { id: true; name: true };
    }) => Promise<Array<{ id: string; name: string }>>;
    count: (args?: { where?: { name?: { not: string } } }) => Promise<number>;
  };
  userInvitation: {
    findMany: (args: {
      where: {
        organizationId: string;
        email: string;
        role: "STUDENT";
      };
      select: {
        id: true;
        status: true;
        acceptedUserId: true;
        studentId: true;
        email: true;
        role: true;
      };
    }) => Promise<
      Array<{
        id: string;
        status: string;
        acceptedUserId: string | null;
        studentId: string | null;
        email: string;
        role: string;
      }>
    >;
    update: (args: {
      where: { id: string };
      data: { studentId: string };
    }) => Promise<unknown>;
  };
  user: {
    findMany: (args: {
      where: { id: string; organizationId: string };
      select: {
        id: true;
        email: true;
        role: true;
        organizationId: true;
      };
    }) => Promise<
      Array<{
        id: string;
        email: string;
        role: string;
        organizationId: string | null;
      }>
    >;
  };
  student: {
    findMany: (args: {
      where: { organizationId: string; userId: string };
      select: {
        id: true;
        userId: true;
        organizationId: true;
        appAccessMode: true;
        category: { select: { name: true } };
      };
    }) => Promise<
      Array<{
        id: string;
        userId: string | null;
        organizationId: string;
        appAccessMode: string;
        category: { name: string } | null;
      }>
    >;
  };
  auditLog: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
  $transaction: <T>(
    fn: (tx: RepairAcceptedStudentInvitationLinkDb) => Promise<T>,
  ) => Promise<T>;
};

export type RepairAcceptedStudentInvitationLinkRefusalCode =
  | "missing_invited_student_email_env"
  | "smoke_organization_missing"
  | "smoke_organization_ambiguous"
  | "unexpected_additional_organizations"
  | "invitation_missing"
  | "invitation_ambiguous"
  | "invitation_not_accepted"
  | "invitation_missing_accepted_user"
  | "invitation_wrong_role"
  | "user_missing"
  | "user_ambiguous"
  | "user_role_mismatch"
  | "user_email_mismatch"
  | "user_org_mismatch"
  | "student_missing"
  | "student_ambiguous"
  | "student_org_mismatch"
  | "student_user_mismatch"
  | "student_category_not_b"
  | "student_app_access_not_app_user"
  | "invitation_student_id_conflict"
  | "apply_failed";

export type RepairAcceptedStudentInvitationLinkPlan = {
  organizationName: typeof CANONICAL_SMOKE_ORGANIZATION_NAME;
  organizationIdPrefix: SafeIdPrefix;
  invitationIdPrefix: SafeIdPrefix;
  acceptedUserIdPrefix: SafeIdPrefix;
  studentIdPrefix: SafeIdPrefix;
  invitationStatus: string;
  invitationRole: string;
  emailRedacted: string;
  currentStudentIdPrefix: SafeIdPrefix | null;
  proposedStudentIdPrefix: SafeIdPrefix;
  alreadyLinked: boolean;
  wouldWrite: boolean;
  categoryName: string;
  appAccessMode: string;
};

export type RepairAcceptedStudentInvitationLinkResult =
  | {
      ok: true;
      plan: RepairAcceptedStudentInvitationLinkPlan;
      applied: boolean;
      wrote: boolean;
    }
  | {
      ok: false;
      code: RepairAcceptedStudentInvitationLinkRefusalCode;
      message: string;
      plan?: RepairAcceptedStudentInvitationLinkPlan;
    };

/**
 * Pure argv parser. Dry-run default; writes only with --apply.
 * Supports pnpm-forwarded `-- --apply`. Never accepts email args.
 */
export function parseRepairAcceptedStudentInvitationLinkArgs(
  argv: readonly string[],
): {
  apply: boolean;
  unknownFlags: string[];
} {
  let apply = false;
  const unknownFlags: string[] = [];
  for (const arg of argv) {
    if (arg === "--") continue;
    if (arg === "--apply") {
      if (apply) {
        unknownFlags.push("--apply(duplicate)");
        continue;
      }
      apply = true;
      continue;
    }
    unknownFlags.push(arg);
  }
  return { apply, unknownFlags };
}

export function formatRepairAcceptedStudentInvitationLinkPlanText(
  plan: RepairAcceptedStudentInvitationLinkPlan,
): string {
  const lines = [
    "Repair accepted student invitation link (DAT Production Smoke)",
    `  organization=${plan.organizationName} idPrefix=${plan.organizationIdPrefix}`,
    `  invitationIdPrefix=${plan.invitationIdPrefix} status=${plan.invitationStatus} role=${plan.invitationRole}`,
    `  email=${plan.emailRedacted}`,
    `  acceptedUserIdPrefix=${plan.acceptedUserIdPrefix}`,
    `  currentStudentIdPrefix=${plan.currentStudentIdPrefix ?? "(null)"}`,
    `  proposedStudentIdPrefix=${plan.proposedStudentIdPrefix}`,
    `  category=${plan.categoryName} appAccessMode=${plan.appAccessMode}`,
    `  alreadyLinked=${String(plan.alreadyLinked)} wouldWrite=${String(plan.wouldWrite)}`,
  ];
  return lines.join("\n");
}

export function formatRepairAcceptedStudentInvitationLinkFailureMessage(
  code: RepairAcceptedStudentInvitationLinkRefusalCode,
): string {
  return `Repair refused (${code}). No remote writes performed by this failure path.`;
}

function refuse(
  code: RepairAcceptedStudentInvitationLinkRefusalCode,
  message: string,
  plan?: RepairAcceptedStudentInvitationLinkPlan,
): RepairAcceptedStudentInvitationLinkResult {
  return plan
    ? { ok: false, code, message, plan }
    : { ok: false, code, message };
}

export async function repairAcceptedStudentInvitationLink(
  db: RepairAcceptedStudentInvitationLinkDb,
  options: {
    apply: boolean;
    invitedStudentEmail: string | undefined;
  },
): Promise<RepairAcceptedStudentInvitationLinkResult> {
  const rawEmail = options.invitedStudentEmail?.trim() ?? "";
  if (!rawEmail) {
    return refuse(
      "missing_invited_student_email_env",
      `Missing ${DAT_SMOKE_INVITED_STUDENT_EMAIL_ENV}. Set the operator-only exact invite email. No writes performed.`,
    );
  }

  const email = normalizeInvitationEmail(rawEmail);

  const namedOrgs = await db.organization.findMany({
    where: { name: CANONICAL_SMOKE_ORGANIZATION_NAME },
    select: { id: true, name: true },
  });

  if (namedOrgs.length === 0) {
    return refuse(
      "smoke_organization_missing",
      "Canonical smoke organization DAT Production Smoke was not found. No writes performed.",
    );
  }
  if (namedOrgs.length > 1) {
    return refuse(
      "smoke_organization_ambiguous",
      "Multiple organizations named DAT Production Smoke found. No writes performed.",
    );
  }

  const org = namedOrgs[0]!;
  const otherOrganizationCount = await db.organization.count({
    where: { name: { not: CANONICAL_SMOKE_ORGANIZATION_NAME } },
  });
  if (otherOrganizationCount > 0) {
    return refuse(
      "unexpected_additional_organizations",
      "Unexpected additional organizations exist on this target. Repair refuses to proceed. No writes performed.",
    );
  }

  const invitations = await db.userInvitation.findMany({
    where: {
      organizationId: org.id,
      email,
      role: "STUDENT",
    },
    select: {
      id: true,
      status: true,
      acceptedUserId: true,
      studentId: true,
      email: true,
      role: true,
    },
  });

  if (invitations.length === 0) {
    return refuse(
      "invitation_missing",
      "No STUDENT invitation found for the operator invite email in the smoke org. No writes performed.",
    );
  }
  if (invitations.length > 1) {
    return refuse(
      "invitation_ambiguous",
      "Multiple STUDENT invitations match the operator invite email. No writes performed.",
    );
  }

  const invitation = invitations[0]!;
  if (invitation.role !== "STUDENT") {
    return refuse(
      "invitation_wrong_role",
      "Invitation role is not STUDENT. No writes performed.",
    );
  }
  if (invitation.status !== "ACCEPTED") {
    return refuse(
      "invitation_not_accepted",
      `Invitation status is ${invitation.status}, expected ACCEPTED. No writes performed.`,
    );
  }
  if (!invitation.acceptedUserId) {
    return refuse(
      "invitation_missing_accepted_user",
      "ACCEPTED invitation is missing acceptedUserId. No writes performed.",
    );
  }

  const users = await db.user.findMany({
    where: {
      id: invitation.acceptedUserId,
      organizationId: org.id,
    },
    select: {
      id: true,
      email: true,
      role: true,
      organizationId: true,
    },
  });

  if (users.length === 0) {
    return refuse(
      "user_missing",
      "Accepted user was not found in the smoke organization. No writes performed.",
    );
  }
  if (users.length > 1) {
    return refuse(
      "user_ambiguous",
      "Multiple users matched acceptedUserId in the smoke organization. No writes performed.",
    );
  }

  const user = users[0]!;
  if (user.organizationId !== org.id) {
    return refuse(
      "user_org_mismatch",
      "Accepted user organization does not match smoke org. No writes performed.",
    );
  }
  if (user.role !== "STUDENT") {
    return refuse(
      "user_role_mismatch",
      "Accepted user role is not STUDENT. No writes performed.",
    );
  }
  if (normalizeInvitationEmail(user.email) !== email) {
    return refuse(
      "user_email_mismatch",
      "Accepted user email does not match the operator invite email. No writes performed.",
    );
  }

  const students = await db.student.findMany({
    where: {
      organizationId: org.id,
      userId: user.id,
    },
    select: {
      id: true,
      userId: true,
      organizationId: true,
      appAccessMode: true,
      category: { select: { name: true } },
    },
  });

  if (students.length === 0) {
    return refuse(
      "student_missing",
      "No Student profile linked to the accepted user was found. No writes performed.",
    );
  }
  if (students.length > 1) {
    return refuse(
      "student_ambiguous",
      "Multiple Student profiles are linked to the accepted user. No writes performed.",
    );
  }

  const student = students[0]!;
  if (student.organizationId !== org.id) {
    return refuse(
      "student_org_mismatch",
      "Student organization does not match smoke org. No writes performed.",
    );
  }
  if (student.userId !== user.id) {
    return refuse(
      "student_user_mismatch",
      "Student is not linked to the accepted user. No writes performed.",
    );
  }
  if (student.category?.name !== "B") {
    return refuse(
      "student_category_not_b",
      "Student category is not B. No writes performed.",
    );
  }
  if (student.appAccessMode !== "APP_USER") {
    return refuse(
      "student_app_access_not_app_user",
      "Student appAccessMode is not APP_USER. No writes performed.",
    );
  }

  if (invitation.studentId && invitation.studentId !== student.id) {
    return refuse(
      "invitation_student_id_conflict",
      "Invitation already has a different studentId. No writes performed.",
    );
  }

  const alreadyLinked = invitation.studentId === student.id;
  const plan: RepairAcceptedStudentInvitationLinkPlan = {
    organizationName: CANONICAL_SMOKE_ORGANIZATION_NAME,
    organizationIdPrefix: toSafeIdPrefix(org.id),
    invitationIdPrefix: toSafeIdPrefix(invitation.id),
    acceptedUserIdPrefix: toSafeIdPrefix(user.id),
    studentIdPrefix: toSafeIdPrefix(student.id),
    invitationStatus: invitation.status,
    invitationRole: invitation.role,
    emailRedacted: redactEmailRecipient(email),
    currentStudentIdPrefix: invitation.studentId
      ? toSafeIdPrefix(invitation.studentId)
      : null,
    proposedStudentIdPrefix: toSafeIdPrefix(student.id),
    alreadyLinked,
    wouldWrite: !alreadyLinked,
    categoryName: student.category?.name ?? "(none)",
    appAccessMode: student.appAccessMode,
  };

  if (alreadyLinked || !options.apply) {
    return {
      ok: true,
      plan,
      applied: false,
      wrote: false,
    };
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.userInvitation.update({
        where: { id: invitation.id },
        data: { studentId: student.id },
      });

      await tx.auditLog.create({
        data: buildAuditLogCreateData({
          organizationId: org.id,
          actorUserId: user.id,
          actorRole: "STUDENT",
          actorEmail: null,
          action: REPAIR_ACCEPTED_STUDENT_INVITATION_LINK_AUDIT_ACTION,
          entityType: "UserInvitation",
          entityId: invitation.id,
          targetUserId: user.id,
          metadata: {
            repaired: true,
            alreadyLinked: false,
            mode: "apply",
            invitationRole: "STUDENT",
            invitationStatus: "ACCEPTED",
            studentLinkSource: "accepted_user_profile",
          },
          status: "SUCCESS",
        }),
      });
    });
  } catch {
    return refuse(
      "apply_failed",
      "Apply transaction failed. No partial write claimed. Re-run dry-run to inspect state.",
      plan,
    );
  }

  return {
    ok: true,
    plan: {
      ...plan,
      currentStudentIdPrefix: toSafeIdPrefix(student.id),
      alreadyLinked: true,
      wouldWrite: false,
    },
    applied: true,
    wrote: true,
  };
}
