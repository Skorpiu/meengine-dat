import type {
  StudentAppAccessMode,
  StudentRecordDto,
} from "@/lib/students/student-record-ui-types";
import { getStudentCanonicalEmailDisplay } from "@/lib/students/student-record-ui-utils";

export const REACTIVATE_STUDENT_APP_ACCESS_MODAL = {
  title: "Reactivate app access?",
  description:
    "This will restore the student's access to the app using the existing student profile. Use this when the student enrolls again and should regain app access without creating a duplicate record.",
  confirmLabel: "Reactivate app access",
} as const;

/** Edit Student → App access: show Reactivate for MANUAL_ONLY with canonical email. */
export function canShowReactivateStudentAppAccessAction(student: {
  appAccessMode: StudentAppAccessMode | string;
  userId: string | null;
  email: string | null;
  user?: StudentRecordDto["user"];
}): boolean {
  if (student.appAccessMode !== "MANUAL_ONLY" || student.userId !== null) {
    return false;
  }
  return (
    getStudentCanonicalEmailDisplay({
      email: student.email,
      user: student.user ?? null,
    }) != null
  );
}

export function canShowStudentReactivateAppAccessSection(student: {
  appAccessMode: StudentAppAccessMode | string;
  userId: string | null;
  email: string | null;
  user?: StudentRecordDto["user"];
}): boolean {
  return canShowReactivateStudentAppAccessAction(student);
}
