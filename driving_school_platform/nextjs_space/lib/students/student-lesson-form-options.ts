import { getStudentDisplayLabel } from "@/lib/students/student-display";

export type LessonFormStudentOptionSource = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  schoolStudentId?: string | null;
  appAccessMode?: string;
  userId?: string | null;
  user?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

export type LessonFormStudentOption = {
  id: string;
  label: string;
  firstName: string | null;
  lastName: string | null;
  schoolStudentId: string | null;
  appAccessMode: string;
  userId: string | null;
};

export function mapStudentRecordToLessonFormOption(
  record: LessonFormStudentOptionSource,
): LessonFormStudentOption {
  return {
    id: record.id,
    label: getStudentDisplayLabel(record),
    firstName: record.firstName ?? null,
    lastName: record.lastName ?? null,
    schoolStudentId: record.schoolStudentId ?? null,
    appAccessMode: record.appAccessMode ?? "",
    userId: record.userId ?? null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Parses `{ success, data: { students } }` from GET /api/admin/students. */
export function parseAdminStudentsListResponse(
  body: unknown,
): LessonFormStudentOption[] {
  if (!isRecord(body)) return [];

  const data = isRecord(body.data) ? body.data : body;
  const studentsRaw = data.students;
  if (!Array.isArray(studentsRaw)) return [];

  return studentsRaw
    .filter(
      (row): row is LessonFormStudentOptionSource =>
        isRecord(row) && typeof row.id === "string",
    )
    .map(mapStudentRecordToLessonFormOption);
}
