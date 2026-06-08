import type { StudentRecordDto } from "@/lib/students/student-record-ui-types";

/** Effective profile address: Student operational field with legacy User fallback. */
export function resolveStudentProfileAddress(
  student: Pick<StudentRecordDto, "address">,
  linkedUserAddress?: string | null,
): string {
  return student.address?.trim() || linkedUserAddress?.trim() || "";
}
