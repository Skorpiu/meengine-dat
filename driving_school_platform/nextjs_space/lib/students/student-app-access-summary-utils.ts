import type { StudentAppAccessMode } from "@/lib/students/student-record-ui-types";
import type { ProfileBadgeVariant } from "@/lib/students/student-profile-label-utils";

export type StudentLinkedAppAccessSummary = {
  isApproved: boolean;
  transmissionType: string;
  selectedCategories: string[];
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

/** Single-line summary, e.g. "Active app access · Automatic · Category B". */
export function formatAppAccessCompactSummaryLine(
  linked: StudentLinkedAppAccessSummary | null,
): string | null {
  if (!linked) {
    return null;
  }

  const parts: string[] = [
    linked.isApproved ? "Active app access" : "App access pending approval",
  ];

  const transmission = linked.transmissionType.trim();
  if (transmission) {
    parts.push(transmission);
  }

  const categoryLabel = formatCategoryCompactLabel(linked.selectedCategories);
  if (categoryLabel) {
    parts.push(categoryLabel);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

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

  const badges: StudentAppAccessCompactBadge[] = [];

  badges.push({
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
  });

  const transmission = linked?.transmissionType.trim();
  if (transmission) {
    badges.push({
      key: "transmission",
      label: transmission,
      variant: "outline",
      tooltip: `Transmission type: ${transmission}`,
    });
  }

  const categoryLabel = formatCategoryCompactLabel(
    linked?.selectedCategories ?? [],
  );
  if (categoryLabel) {
    badges.push({
      key: "categories",
      label: categoryLabel,
      variant: "outline",
      tooltip: `License categories: ${(linked?.selectedCategories ?? []).join(", ")}`,
    });
  }

  return badges;
}
