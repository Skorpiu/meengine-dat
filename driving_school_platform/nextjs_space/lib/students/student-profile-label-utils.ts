import type {
  StudentAppAccessMode,
  StudentRecordDto,
  StudentRecordPendingInvitationDto,
} from "@/lib/students/student-record-ui-types";

export type ProfileBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline";

export function getStudentProfileOriginLabel(
  source: string | null | undefined,
): string {
  switch (source) {
    case "MANUAL":
      return "Manual profile";
    case "IMPORT":
      return "Imported profile";
    case "AUTO":
    case "LEGACY":
      return "System profile";
    default:
      return "Profile";
  }
}

export function getStudentProfileOriginBadgeVariant(
  source: string | null | undefined,
): ProfileBadgeVariant {
  switch (source) {
    case "IMPORT":
      return "secondary";
    default:
      return "outline";
  }
}

export function getStudentAppAccessStatusLabel(student: {
  appAccessMode: StudentAppAccessMode;
  pendingInvitation: StudentRecordPendingInvitationDto | null;
}): string {
  switch (student.appAccessMode) {
    case "MANUAL_ONLY":
      return "No app access";
    case "INVITED":
      return student.pendingInvitation ? "Pending invite" : "Invite pending";
    case "APP_USER":
      return "App access";
    default:
      return student.appAccessMode;
  }
}

export function getStudentAppAccessStatusBadgeVariant(student: {
  appAccessMode: StudentAppAccessMode;
  pendingInvitation: StudentRecordPendingInvitationDto | null;
}): ProfileBadgeVariant {
  switch (student.appAccessMode) {
    case "MANUAL_ONLY":
      return "outline";
    case "INVITED":
      return student.pendingInvitation ? "default" : "destructive";
    case "APP_USER":
      return "secondary";
    default:
      return "outline";
  }
}

export function getStudentProfileOriginTooltip(
  source: string | null | undefined,
): string {
  switch (source) {
    case "MANUAL":
      return "Created manually in the school (Onboarding or admin).";
    case "IMPORT":
      return "Imported from a CSV/JSON file; app access is not granted by import.";
    case "AUTO":
    case "LEGACY":
      return "System-assigned or legacy profile origin.";
    default:
      return "Operational student profile at the school.";
  }
}

export function getStudentAppAccessStatusTooltip(student: {
  appAccessMode: StudentAppAccessMode;
  pendingInvitation: StudentRecordPendingInvitationDto | null;
}): string {
  switch (student.appAccessMode) {
    case "MANUAL_ONLY":
      return "No app login linked yet. Send an invitation from this row when needed.";
    case "INVITED":
      return student.pendingInvitation
        ? "An invitation is pending for this profile."
        : "Marked as invite pending but no active invitation was found.";
    case "APP_USER":
      return "Linked to an app login account.";
    default:
      return "App access state for this profile.";
  }
}

export type StudentProfileLabelFields = Pick<
  StudentRecordDto,
  "schoolStudentIdSource" | "appAccessMode" | "pendingInvitation"
>;

export function getStudentProfileRowBadges(student: StudentProfileLabelFields) {
  return [
    {
      key: "origin",
      label: getStudentProfileOriginLabel(student.schoolStudentIdSource),
      variant: getStudentProfileOriginBadgeVariant(
        student.schoolStudentIdSource,
      ),
      tooltip: getStudentProfileOriginTooltip(student.schoolStudentIdSource),
    },
    {
      key: "app-access",
      label: getStudentAppAccessStatusLabel(student),
      variant: getStudentAppAccessStatusBadgeVariant(student),
      tooltip: getStudentAppAccessStatusTooltip(student),
    },
  ] as const;
}
