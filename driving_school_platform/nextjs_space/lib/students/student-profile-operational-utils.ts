import {
  formatCategoryCompactLabel,
  type StudentAppAccessCompactBadge,
} from "@/lib/students/student-app-access-summary-utils";

export type StudentProfileOperationalFields = {
  category: { name: string } | null;
  transmissionType: { name: string } | null;
};

/** Row badges for license category and transmission on the Student profile (all access modes). */
export function getStudentProfileOperationalCompactBadges(
  student: StudentProfileOperationalFields,
): StudentAppAccessCompactBadge[] {
  const badges: StudentAppAccessCompactBadge[] = [];

  const transmission = student.transmissionType?.name?.trim();
  if (transmission) {
    badges.push({
      key: "profile-transmission",
      label: transmission,
      variant: "outline",
      tooltip: `Transmission type: ${transmission}`,
    });
  }

  const categoryName = student.category?.name?.trim();
  const categoryLabel = formatCategoryCompactLabel(
    categoryName ? [categoryName] : [],
  );
  if (categoryLabel) {
    badges.push({
      key: "profile-category",
      label: categoryLabel,
      variant: "outline",
      tooltip: `License category: ${categoryName}`,
    });
  }

  return badges;
}
