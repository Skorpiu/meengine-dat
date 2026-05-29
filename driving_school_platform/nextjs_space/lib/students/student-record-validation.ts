import { z } from "zod";
import { buildSchoolStudentId } from "@/lib/students/student-school-id";

const trimmedString = z.string().trim();

export const STUDENT_APP_ACCESS_MODES = [
  "MANUAL_ONLY",
  "INVITED",
  "APP_USER",
] as const;

export type StudentAppAccessModeParam =
  (typeof STUDENT_APP_ACCESS_MODES)[number];

export const isStudentAppAccessModeParam = (
  value: string,
): value is StudentAppAccessModeParam =>
  (STUDENT_APP_ACCESS_MODES as readonly string[]).includes(value);

export const createManualStudentBodySchema = z.object({
  firstName: trimmedString.min(1, "first_name_required"),
  lastName: trimmedString.optional(),
  phoneNumber: trimmedString.optional(),
  email: trimmedString.optional(),
  yearSuffix: trimmedString.min(1, "year_suffix_required"),
  sequenceNumber: z.number({ required_error: "sequence_number_required" }),
  enrollmentDate: trimmedString.optional(),
});

export type CreateManualStudentBody = z.infer<
  typeof createManualStudentBodySchema
>;

export const patchStudentRecordBodySchema = z
  .object({
    firstName: trimmedString.min(1).optional(),
    lastName: z.string().trim().nullable().optional(),
    phoneNumber: z.string().trim().nullable().optional(),
    email: z.string().trim().email().nullable().optional(),
    yearSuffix: trimmedString.optional(),
    sequenceNumber: z.number().optional(),
    enrollmentDate: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const hasYear = data.yearSuffix !== undefined;
    const hasSeq = data.sequenceNumber !== undefined;
    if (hasYear !== hasSeq) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "year_suffix_and_sequence_number_required_together",
        path: hasYear ? ["sequenceNumber"] : ["yearSuffix"],
      });
    }
  });

export type PatchStudentRecordBody = z.infer<
  typeof patchStudentRecordBodySchema
>;

export function parseOptionalEnrollmentDate(
  value: string | undefined,
): { ok: true; value: Date } | { ok: false; error: string } {
  if (value === undefined || value === "") {
    return { ok: true, value: new Date() };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "enrollment_date_invalid" };
  }
  return { ok: true, value: date };
}

export function parseEnrollmentDateForPatch(
  value: string | null | undefined,
): { ok: true; value: Date | null | undefined } | { ok: false; error: string } {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (value === null) {
    return { ok: true, value: null };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "enrollment_date_invalid" };
  }
  return { ok: true, value: date };
}

export function resolveSchoolStudentIdFromParts(
  yearSuffix: string,
  sequenceNumber: number,
):
  | {
      ok: true;
      parts: {
        schoolStudentId: string;
        yearSuffix: string;
        sequenceNumber: number;
      };
    }
  | { ok: false; error: string } {
  const built = buildSchoolStudentId(yearSuffix, sequenceNumber);
  if (!built.ok) {
    return { ok: false, error: built.error };
  }
  return {
    ok: true,
    parts: {
      schoolStudentId: built.value,
      yearSuffix,
      sequenceNumber,
    },
  };
}

export function normalizeStudentRecordEmail(
  email: string | undefined | null,
): string | null {
  if (email === undefined || email === null) return null;
  const trimmed = email.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

export function normalizeStudentRecordPhone(
  phone: string | undefined | null,
): string | null {
  if (phone === undefined || phone === null) return null;
  const trimmed = phone.trim();
  return trimmed || null;
}
