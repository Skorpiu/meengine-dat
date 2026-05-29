export type SchoolStudentIdParts = {
  canonicalId: string;
  yearSuffix: string;
  sequenceText: string;
  sequenceNumber: number;
};

export type SchoolStudentIdBuildResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export type SchoolStudentIdParseResult =
  | { ok: true; value: SchoolStudentIdParts }
  | { ok: false; error: string };

export type SchoolStudentIdNormalizeResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

const YEAR_SUFFIX_RE = /^\d{2}$/;
const DIGITS_ONLY_RE = /^\d+$/;

function invalidBuild(error: string): SchoolStudentIdBuildResult {
  return { ok: false, error };
}

function invalidParse(error: string): SchoolStudentIdParseResult {
  return { ok: false, error };
}

function invalidNormalize(error: string): SchoolStudentIdNormalizeResult {
  return { ok: false, error };
}

export function buildSchoolStudentId(
  yearSuffix: string,
  sequenceNumber: number,
): SchoolStudentIdBuildResult {
  if (!YEAR_SUFFIX_RE.test(yearSuffix)) {
    return invalidBuild("year_suffix_must_be_2_digits");
  }
  if (!Number.isInteger(sequenceNumber)) {
    return invalidBuild("sequence_must_be_integer");
  }
  if (sequenceNumber < 1 || sequenceNumber > 999) {
    return invalidBuild("sequence_out_of_range");
  }
  const sequenceText = String(sequenceNumber).padStart(3, "0");
  return { ok: true, value: `${yearSuffix}${sequenceText}` };
}

export function parseCanonicalSchoolStudentId(
  input: string,
): SchoolStudentIdParseResult {
  const trimmed = input.trim();
  if (!DIGITS_ONLY_RE.test(trimmed)) {
    return invalidParse("school_student_id_must_be_digits_only");
  }
  if (trimmed.length !== 5) {
    return invalidParse("school_student_id_must_be_5_digits");
  }

  const yearSuffix = trimmed.slice(0, 2);
  const sequenceText = trimmed.slice(2);
  const sequenceNumber = Number.parseInt(sequenceText, 10);
  if (sequenceNumber < 1) {
    return invalidParse("school_student_id_sequence_invalid");
  }

  return {
    ok: true,
    value: {
      canonicalId: trimmed,
      yearSuffix,
      sequenceText,
      sequenceNumber,
    },
  };
}

export function normalizeSchoolStudentIdSearchQuery(
  query: string,
): SchoolStudentIdNormalizeResult {
  const trimmed = query.trim();
  if (!DIGITS_ONLY_RE.test(trimmed)) {
    return invalidNormalize("school_student_id_search_must_be_digits_only");
  }
  if (trimmed.length < 3 || trimmed.length > 5) {
    return invalidNormalize("school_student_id_search_invalid_length");
  }

  const yearSuffix = trimmed.slice(0, 2);
  const sequenceRaw = trimmed.slice(2);
  const sequenceNumber = Number.parseInt(sequenceRaw, 10);
  if (
    !Number.isInteger(sequenceNumber) ||
    sequenceNumber < 1 ||
    sequenceNumber > 999
  ) {
    return invalidNormalize("school_student_id_search_sequence_invalid");
  }

  const built = buildSchoolStudentId(yearSuffix, sequenceNumber);
  if (!built.ok) {
    return invalidNormalize(built.error);
  }
  return { ok: true, value: built.value };
}

export function isValidCanonicalSchoolStudentId(input: string): boolean {
  return parseCanonicalSchoolStudentId(input).ok;
}
