export const PEOPLE_L1_TAB_VALUES = ["students", "instructors"] as const;

export type PeopleL1TabValue = (typeof PEOPLE_L1_TAB_VALUES)[number];

export const PEOPLE_L1_TAB_LABELS: Record<PeopleL1TabValue, string> = {
  students: "Students",
  instructors: "Instructors",
};

export const PEOPLE_PAGE_HEADER_DESCRIPTION =
  "Manage school students and instructors — profiles, onboarding, and operational app access. Technical accounts are available below as advanced diagnostics only.";

export const ADVANCED_ACCOUNTS_SECTION = {
  title: "Advanced accounts",
  description:
    "Advanced accounts shows technical app-account records for diagnostics. Manage students and instructors from their Profiles and Onboarding sections.",
  defaultOpen: false,
} as const;

export type AppAccountLinkStatus = "linked" | "unlinked";

type AppAccountUserShape = {
  role: string;
  student?: unknown | null;
  instructor?: unknown | null;
};

export function getAppAccountLinkStatus(
  user: AppAccountUserShape,
): AppAccountLinkStatus {
  if (user.role === "STUDENT") {
    return user.student ? "linked" : "unlinked";
  }
  if (user.role === "INSTRUCTOR") {
    return user.instructor ? "linked" : "unlinked";
  }
  return "unlinked";
}

export function getAppAccountLinkLabel(status: AppAccountLinkStatus): string {
  return status === "linked" ? "Linked profile" : "Unlinked account";
}

export function getAppAccountApprovalLabel(isApproved: boolean): string {
  return isApproved ? "Approved" : "Pending approval";
}
