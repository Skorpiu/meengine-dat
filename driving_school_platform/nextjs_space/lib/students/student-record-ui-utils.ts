import { buildSchoolStudentId } from "@/lib/students/student-school-id";
import { canShowStudentRecordDeleteAction } from "@/lib/students/student-record-delete-policy";
import type {
  StudentAppAccessMode,
  StudentRecordDto,
} from "@/lib/students/student-record-ui-types";

export { canShowStudentRecordDeleteAction };

export function formatStudentRecordDate(
  iso: string | null | undefined,
): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatEnrollmentDateInputValue(
  iso: string | null | undefined,
): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function getStudentRecordDisplayName(student: StudentRecordDto): string {
  const first = student.firstName?.trim() ?? "";
  const last = student.lastName?.trim() ?? "";
  const combined = [first, last].filter(Boolean).join(" ");
  if (combined) return combined;
  if (student.user) {
    return [student.user.firstName, student.user.lastName]
      .filter(Boolean)
      .join(" ");
  }
  return student.schoolStudentId ?? "Student";
}

/** School Admin canonical email — one field, not separate operational vs login. */
export function getStudentCanonicalEmailDisplay(
  student: Pick<StudentRecordDto, "email" | "user">,
  linkedEmail?: string | null,
): string | null {
  return (
    student.email?.trim() ||
    linkedEmail?.trim() ||
    student.user?.email?.trim() ||
    null
  );
}

export { getStudentAppAccessLabel } from "@/lib/students/student-record-invitation-ui-utils";

export function canSendStudentRecordInvite(student: {
  userId: string | null;
  appAccessMode: StudentAppAccessMode;
}): boolean {
  return student.appAccessMode === "MANUAL_ONLY" && student.userId === null;
}

/** Edit Student dialog: show App access section for linked login account. */
export function canShowStudentAppAccessSection(student: {
  userId: string | null;
  appAccessMode: StudentAppAccessMode | string;
}): boolean {
  return student.appAccessMode === "APP_USER" && student.userId !== null;
}

/** Edit Student dialog: show pending invitation status (read-only; actions stay on row). */
export function canShowStudentPendingInvitationSection(student: {
  appAccessMode: StudentAppAccessMode | string;
}): boolean {
  return student.appAccessMode === "INVITED";
}

export type LinkedStudentUserUpdateForm = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
  selectedCategories: string[];
  transmissionType: string;
};

export function buildLinkedStudentUserUpdateBody(input: {
  userId: string;
  form: LinkedStudentUserUpdateForm;
}): Record<string, unknown> {
  return {
    userId: input.userId,
    firstName: input.form.firstName.trim(),
    lastName: input.form.lastName.trim(),
    phoneNumber: input.form.phoneNumber.trim(),
    address: input.form.address.trim(),
    role: "STUDENT",
    selectedCategories: input.form.selectedCategories,
    transmissionType: input.form.transmissionType,
  };
}

export function hasLinkedStudentUserFormChanges(
  form: LinkedStudentUserUpdateForm,
  original: LinkedStudentUserUpdateForm | null,
): boolean {
  if (!original) return true;
  return (
    form.firstName.trim() !== original.firstName.trim() ||
    form.lastName.trim() !== original.lastName.trim() ||
    form.phoneNumber.trim() !== original.phoneNumber.trim() ||
    form.address.trim() !== original.address.trim() ||
    form.transmissionType !== original.transmissionType ||
    form.selectedCategories.join(",") !== original.selectedCategories.join(",")
  );
}

export function toLinkedStudentUserUpdateForm(input: {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
  selectedCategories: string[];
  transmissionType: string;
}): LinkedStudentUserUpdateForm {
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    phoneNumber: input.phoneNumber,
    address: input.address,
    selectedCategories: [...input.selectedCategories],
    transmissionType: input.transmissionType,
  };
}

export function buildStudentRecordInvitePayload(input: {
  studentEmail: string | null | undefined;
  inviteEmail: string;
}): { email?: string } | { error: string } {
  const trimmed = input.inviteEmail.trim();
  if (trimmed) {
    return { email: trimmed };
  }
  if (input.studentEmail?.trim()) {
    return {};
  }
  return { error: "missing_email" };
}

export function previewSchoolStudentId(
  yearSuffix: string,
  sequenceNumberRaw: string,
): string | null {
  const trimmedYear = yearSuffix.trim();
  const sequenceNumber = Number.parseInt(sequenceNumberRaw.trim(), 10);
  if (!trimmedYear || !Number.isFinite(sequenceNumber)) {
    return null;
  }
  const built = buildSchoolStudentId(trimmedYear, sequenceNumber);
  return built.ok ? built.value : null;
}

export function studentRecordApiErrorMessage(
  code: string | undefined,
  fallback: string,
): string {
  switch (code) {
    case "school_student_id_already_exists":
      return "A student with this ID already exists in this school.";
    case "year_suffix_must_be_2_digits":
      return "Enrollment year must be exactly 2 digits (e.g. 26).";
    case "sequence_out_of_range":
      return "Enrollment number must be between 1 and 999.";
    case "sequence_must_be_integer":
      return "Enrollment number must be a whole number.";
    case "invalid_email":
      return "Invalid email.";
    case "enrollment_date_invalid":
      return "Invalid enrollment date.";
    case "demo_restricted_action":
    case "demo_mutation_disabled":
      return (
        fallback || "This action is not available in the demo environment."
      );
    case "missing_email":
      return "Enter an email address to send the invitation.";
    case "student_already_linked":
      return "This student record is already linked to an account.";
    case "student_not_found":
      return "Student record not found.";
    case "student_not_invitable":
      return "This student record already has app access.";
    case "pending_invitation_exists":
      return "A pending invitation already exists for this email.";
    case "user_already_exists":
      return "An account with this email already exists.";
    case "student_not_manual_only":
      return "This action is only available for manual student records without active app access.";
    case "student_has_linked_user":
      return "This student record is linked to an account and cannot be removed.";
    case "student_has_invitations":
      return "This student record has invitations — revoke or wait before deleting.";
    case "student_has_lessons":
      return "This student record has lessons or history and cannot be removed.";
    case "student_has_lesson_counters":
      return "This student record has lesson counters and cannot be removed.";
    case "student_has_lesson_requests":
      return "This student record has lesson requests and cannot be removed.";
    case "student_has_exam_registrations":
      return "This student record has exam registrations and cannot be removed.";
    case "student_has_payments":
      return "This student record has payments and cannot be removed.";
    case "student_not_app_user":
      return "Only students with active app access can have app access removed.";
    case "student_no_linked_user":
      return "This student record has no linked app account.";
    case "linked_user_not_found":
      return "Linked app account not found.";
    case "linked_user_role_mismatch":
      return "Linked app account is not a student account.";
    case "linked_user_tenant_mismatch":
      return "Linked app account does not belong to this school.";
    case "student_app_access_already_removed":
      return "App access has already been removed for this student.";
    case "student_already_has_app_access":
      return "This student already has active app access.";
    case "student_has_pending_invitation":
      return "This student has a pending invitation. Revoke it before reactivating app access.";
    case "reactivate_orphan_user_not_found":
      return "No existing app account was found for this email. Use Send invitation on the profile row instead.";
    case "user_linked_to_other_student":
      return "An app account with this email is already linked to another student record.";
    case "orphan_user_role_mismatch":
      return "Existing app account is not a student account.";
    case "orphan_user_tenant_mismatch":
      return "Existing app account does not belong to this school.";
    case "student_email_user_mismatch":
      return "Student email does not match the existing app account. Change email is not available yet.";
    default:
      return fallback;
  }
}

export type ManualStudentCreatePayload = {
  firstName: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  yearSuffix: string;
  sequenceNumber: number;
  enrollmentDate?: string;
};

export function buildManualStudentCreatePayload(input: {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  yearSuffix: string;
  sequenceNumber: string;
  enrollmentDate: string;
}): ManualStudentCreatePayload | { error: string } {
  const firstName = input.firstName.trim();
  if (!firstName) {
    return { error: "first_name_required" };
  }

  const yearSuffix = input.yearSuffix.trim();
  const sequenceNumber = Number.parseInt(input.sequenceNumber.trim(), 10);
  if (!yearSuffix) {
    return { error: "year_suffix_required" };
  }
  if (!Number.isFinite(sequenceNumber)) {
    return { error: "sequence_number_required" };
  }

  const built = buildSchoolStudentId(yearSuffix, sequenceNumber);
  if (!built.ok) {
    return { error: built.error };
  }

  const payload: ManualStudentCreatePayload = {
    firstName,
    yearSuffix,
    sequenceNumber,
  };

  const lastName = input.lastName.trim();
  if (lastName) payload.lastName = lastName;

  const phoneNumber = input.phoneNumber.trim();
  if (phoneNumber) payload.phoneNumber = phoneNumber;

  const email = input.email.trim();
  if (email) payload.email = email;

  const enrollmentDate = input.enrollmentDate.trim();
  if (enrollmentDate) payload.enrollmentDate = enrollmentDate;

  return payload;
}

export type ManualStudentPatchPayload = {
  firstName?: string;
  lastName?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  yearSuffix?: string;
  sequenceNumber?: number;
  enrollmentDate?: string | null;
};

export function buildManualStudentPatchPayload(input: {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  yearSuffix: string;
  sequenceNumber: string;
  enrollmentDate: string;
  original: StudentRecordDto;
}): ManualStudentPatchPayload {
  const payload: ManualStudentPatchPayload = {};

  const firstName = input.firstName.trim();
  if (firstName && firstName !== (input.original.firstName ?? "")) {
    payload.firstName = firstName;
  }

  const lastName = input.lastName.trim();
  if (lastName !== (input.original.lastName ?? "")) {
    payload.lastName = lastName || null;
  }

  const phoneNumber = input.phoneNumber.trim();
  if (phoneNumber !== (input.original.phoneNumber ?? "")) {
    payload.phoneNumber = phoneNumber || null;
  }

  const email = input.email.trim();
  if (email !== (input.original.email ?? "")) {
    payload.email = email || null;
  }

  const enrollmentInput = input.enrollmentDate.trim();
  const originalEnrollment = formatEnrollmentDateInputValue(
    input.original.enrollmentDate,
  );
  if (enrollmentInput !== originalEnrollment) {
    payload.enrollmentDate = enrollmentInput || null;
  }

  const yearSuffix = input.yearSuffix.trim();
  const sequenceNumber = Number.parseInt(input.sequenceNumber.trim(), 10);
  const origYear = input.original.schoolStudentYearSuffix ?? "";
  const origSeq = input.original.schoolStudentSequence ?? null;

  if (
    yearSuffix !== origYear ||
    (Number.isFinite(sequenceNumber) && sequenceNumber !== origSeq)
  ) {
    payload.yearSuffix = yearSuffix;
    payload.sequenceNumber = sequenceNumber;
  }

  return payload;
}
