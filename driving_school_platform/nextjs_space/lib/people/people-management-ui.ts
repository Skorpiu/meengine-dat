export const PEOPLE_L1_TAB_VALUES = ["students", "instructors"] as const;

export type PeopleL1TabValue = (typeof PEOPLE_L1_TAB_VALUES)[number];

export const PEOPLE_L1_TAB_LABELS: Record<PeopleL1TabValue, string> = {
  students: "Students",
  instructors: "Instructors",
};

export const PEOPLE_PAGE_HEADER_DESCRIPTION =
  "Manage school students and instructors — profiles, onboarding, and operational app access.";
