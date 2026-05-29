import { buildSchoolStudentId } from "@/lib/students/student-school-id";
import type {
  StudentAppAccessMode,
  StudentRecordDto,
} from "@/lib/students/student-record-ui-types";

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

export function getStudentAppAccessLabel(mode: StudentAppAccessMode): string {
  switch (mode) {
    case "MANUAL_ONLY":
      return "Sem acesso à app";
    case "INVITED":
      return "Convite enviado";
    case "APP_USER":
      return "Com acesso à app";
    default:
      return mode;
  }
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
      return "Já existe um aluno com este ID nesta escola.";
    case "year_suffix_must_be_2_digits":
      return "O ano de inscrição deve ter exatamente 2 dígitos (ex.: 26).";
    case "sequence_out_of_range":
      return "O nº de inscrição deve estar entre 1 e 999.";
    case "sequence_must_be_integer":
      return "O nº de inscrição deve ser um número inteiro.";
    case "invalid_email":
      return "Email inválido.";
    case "enrollment_date_invalid":
      return "Data de inscrição inválida.";
    case "demo_restricted_action":
    case "demo_mutation_disabled":
      return (
        fallback || "Esta ação não está disponível no ambiente de demonstração."
      );
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
