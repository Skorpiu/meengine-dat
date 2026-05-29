import { prisma } from "@/lib/db";
import { LESSON_TYPES } from "@/lib/constants";
import type { LessonSource, Prisma } from "@prisma/client";
import { parseCanonicalSchoolStudentId } from "@/lib/students/student-school-id";
import type { PracticalLessonExportSource } from "@/lib/import-export/practical-lesson-export";

export const PRACTICAL_LESSON_EXPORT_SELECT = {
  lessonDate: true,
  startTime: true,
  endTime: true,
  durationMinutes: true,
  practicalLessonNumber: true,
  lessonSource: true,
  status: true,
  adminNotes: true,
  student: { select: { schoolStudentId: true } },
  instructor: {
    select: {
      user: { select: { email: true, firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.LessonSelect;

export type PracticalLessonExportFilters = {
  organizationId: string;
  studentId?: string;
  schoolStudentId?: string;
  source?: LessonSource;
  from?: string;
  to?: string;
};

export type PracticalLessonExportFilterError = {
  code: "invalid_school_student_id" | "invalid_date_range";
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function buildPracticalLessonExportWhere(input: {
  organizationId: string;
  resolvedStudentId?: string;
  schoolStudentId?: string;
  source?: LessonSource;
  from?: string;
  to?: string;
}):
  | { ok: true; where: Prisma.LessonWhereInput }
  | { ok: false; error: PracticalLessonExportFilterError } {
  const where: Prisma.LessonWhereInput = {
    organizationId: input.organizationId,
    lessonType: LESSON_TYPES.DRIVING,
  };

  if (input.source) {
    where.lessonSource = input.source;
  }

  if (input.from || input.to) {
    if (
      (input.from && !isValidIsoDate(input.from)) ||
      (input.to && !isValidIsoDate(input.to))
    ) {
      return { ok: false, error: { code: "invalid_date_range" } };
    }

    const lessonDate: Prisma.DateTimeFilter = {};
    if (input.from) {
      lessonDate.gte = new Date(`${input.from}T00:00:00.000Z`);
    }
    if (input.to) {
      lessonDate.lte = new Date(`${input.to}T23:59:59.999Z`);
    }
    where.lessonDate = lessonDate;
  }

  if (input.schoolStudentId?.trim()) {
    const parsed = parseCanonicalSchoolStudentId(input.schoolStudentId.trim());
    if (!parsed.ok) {
      return { ok: false, error: { code: "invalid_school_student_id" } };
    }
    where.student = {
      is: {
        organizationId: input.organizationId,
        schoolStudentId: parsed.value.canonicalId,
      },
    };
  }

  if (input.resolvedStudentId) {
    where.studentId = input.resolvedStudentId;
  }

  return { ok: true, where };
}

export async function listPracticalLessonsForExport(
  input: PracticalLessonExportFilters,
): Promise<
  | { ok: true; rows: PracticalLessonExportSource[] }
  | { ok: false; error: PracticalLessonExportFilterError }
> {
  let resolvedStudentId: string | undefined;
  if (input.studentId?.trim()) {
    const student = await prisma.student.findFirst({
      where: {
        id: input.studentId.trim(),
        organizationId: input.organizationId,
      },
      select: { id: true },
    });
    if (!student) {
      return { ok: true, rows: [] };
    }
    resolvedStudentId = student.id;
  }

  const built = buildPracticalLessonExportWhere({
    organizationId: input.organizationId,
    resolvedStudentId,
    schoolStudentId: input.schoolStudentId,
    source: input.source,
    from: input.from,
    to: input.to,
  });
  if (!built.ok) {
    return built;
  }

  const rows = await prisma.lesson.findMany({
    where: built.where,
    select: PRACTICAL_LESSON_EXPORT_SELECT,
    orderBy: [
      { student: { schoolStudentId: { sort: "asc", nulls: "last" } } },
      { practicalLessonNumber: { sort: "asc", nulls: "last" } },
      { lessonDate: "asc" },
      { startTime: "asc" },
    ],
  });

  return { ok: true, rows: rows as PracticalLessonExportSource[] };
}
