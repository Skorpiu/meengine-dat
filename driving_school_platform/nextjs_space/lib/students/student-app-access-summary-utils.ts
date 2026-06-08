import type { StudentAppAccessMode } from "@/lib/students/student-record-ui-types";
import type { ProfileBadgeVariant } from "@/lib/students/student-profile-label-utils";

export type StudentLinkedAppAccessSummary = {
  isApproved: boolean;
};

export type StudentAppAccessCompactBadge = {
  key: string;
  label: string;
  variant: ProfileBadgeVariant;
  tooltip: string;
};

export function formatCategoryCompactLabel(
  categories: string[],
): string | null {
  const trimmed = categories.map((c) => c.trim()).filter(Boolean);
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length === 1) {
    return `Category ${trimmed[0]}`;
  }
  return `Categories ${trimmed.join(", ")}`;
}

/** Single-line app-access status summary (login/approval only). */
export function formatAppAccessCompactSummaryLine(
  linked: StudentLinkedAppAccessSummary | null,
): string | null {
  if (!linked) {
    return null;
  }

  return linked.isApproved
    ? "Active app access"
    : "App access pending approval";
}

/** Compact badges for APP_USER login/approval status only (not profile operational fields). */
export function getStudentAppAccessCompactBadges(
  student: {
    appAccessMode: StudentAppAccessMode | string;
    userId: string | null;
  },
  linked: StudentLinkedAppAccessSummary | null,
): StudentAppAccessCompactBadge[] {
  if (student.appAccessMode !== "APP_USER" || student.userId == null) {
    return [];
  }

  return [
    {
      key: "app-access-status",
      label:
        linked?.isApproved === false
          ? "App access pending approval"
          : "Active app access",
      variant: linked?.isApproved === false ? "default" : "secondary",
      tooltip:
        linked?.isApproved === false
          ? "App account exists but is not approved to sign in yet."
          : "Student has active app access and can sign in when approved.",
    },
  ];
}
