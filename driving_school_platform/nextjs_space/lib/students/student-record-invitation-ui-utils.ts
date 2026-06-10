import type { InvitationDto } from "@/lib/invitations/invitation-dto";
import type {
  StudentAppAccessMode,
  StudentRecordDto,
  StudentRecordPendingInvitationDto,
} from "@/lib/students/student-record-ui-types";
import { getStudentAppAccessStatusLabel } from "@/lib/students/student-profile-label-utils";

export function getStudentAppAccessLabel(
  mode: StudentAppAccessMode,
  options?: {
    pendingInvitation?: StudentRecordPendingInvitationDto | null;
  },
): string {
  return getStudentAppAccessStatusLabel({
    appAccessMode: mode,
    pendingInvitation: options?.pendingInvitation ?? null,
  });
}

export function formatPendingInvitationExpiry(
  expiresAtIso: string | null | undefined,
): string {
  if (!expiresAtIso) {
    return "—";
  }
  const date = new Date(expiresAtIso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function canRevokeStudentRecordInvitation(student: {
  appAccessMode: StudentAppAccessMode;
  pendingInvitation: StudentRecordPendingInvitationDto | null;
}): boolean {
  return (
    student.appAccessMode === "INVITED" &&
    student.pendingInvitation?.status === "PENDING" &&
    Boolean(student.pendingInvitation.invitationId)
  );
}

/** Profiles → App access: linked pending STUDENT invitation email update. */
export function canShowLinkedStudentInvitationChangeEmailAction(student: {
  appAccessMode: StudentAppAccessMode;
  userId: string | null;
  pendingInvitation: StudentRecordPendingInvitationDto | null;
}): boolean {
  return (
    student.appAccessMode === "INVITED" &&
    student.userId == null &&
    student.pendingInvitation?.status === "PENDING" &&
    Boolean(student.pendingInvitation.invitationId)
  );
}

export function mapStudentRecordPendingInvitationToDto(
  student: StudentRecordDto,
): InvitationDto | null {
  const pending = student.pendingInvitation;
  if (!pending?.invitationId) {
    return null;
  }

  return {
    id: pending.invitationId,
    studentId: student.id,
    email: pending.email,
    role: "STUDENT",
    status: "PENDING",
    expiresAt: pending.expiresAt,
    acceptedAt: null,
    revokedAt: null,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
    createdBy: null,
    acceptedUser: null,
  };
}

export function getStudentAppAccessDetailLines(
  student: Pick<
    StudentRecordDto,
    "appAccessMode" | "pendingInvitation" | "user" | "email"
  >,
): string[] {
  const lines: string[] = [];

  switch (student.appAccessMode) {
    case "MANUAL_ONLY":
      lines.push("No app login yet. Send an invitation to grant app access.");
      break;
    case "INVITED": {
      const pending = student.pendingInvitation;
      if (pending) {
        lines.push(`Invite email: ${pending.email}`);
        lines.push(
          `Expires: ${formatPendingInvitationExpiry(pending.expiresAt)}`,
        );
        lines.push(
          "Invite links are shown once when created. Revoke here if needed, then send a new invitation.",
        );
      } else {
        lines.push(getStudentInvitedWithoutPendingHelp());
      }
      break;
    }
    case "APP_USER": {
      break;
    }
    default:
      break;
  }

  return lines;
}

export function getStudentInvitedWithoutPendingHelp(): string {
  return "Marked as invite pending, but no active pending invitation was found. Check Students → Onboarding or send a new invitation after resolving any duplicate email invites.";
}
