import type { StudentAppAccessMode } from "@/lib/students/student-record-ui-types";

export const REMOVE_STUDENT_APP_ACCESS_MODAL = {
  title: "Remove app access?",
  description:
    "This will disable the student's access to the app while preserving the student profile, lessons, payments, and history. The student can be reactivated later if they enroll again.",
  confirmLabel: "Remove app access",
} as const;

/** Edit Student → App access: show Remove app access only for active APP_USER. */
export function canShowRemoveStudentAppAccessAction(student: {
  appAccessMode: StudentAppAccessMode | string;
  userId: string | null;
}): boolean {
  return student.appAccessMode === "APP_USER" && student.userId !== null;
}
