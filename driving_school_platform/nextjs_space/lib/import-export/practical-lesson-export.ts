/**
 * Practical lesson export helpers (pure — no Prisma or server-only deps).
 * See docs/engineering/client-data-import-export-strategy.md
 */
import {
  IMPORT_EXPORT_ENTITIES,
  IMPORT_EXPORT_FORMAT_VERSION,
  PRACTICAL_LESSON_EXPORT_CSV_HEADERS,
  RECOMMENDED_CSV_DELIMITER,
  type PracticalLessonExportRow,
} from "@/lib/import-export/import-export-contracts";
import {
  escapeCsvField,
  formatExportDate,
} from "@/lib/import-export/student-record-export";

/** Minimal lesson fields needed to build an export row. */
export type PracticalLessonExportSource = {
  lessonDate: Date;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
  practicalLessonNumber: number | null;
  lessonSource: string;
  status: string;
  adminNotes: string | null;
  student: { schoolStudentId: string | null } | null;
  instructor: {
    user: {
      email: string;
      firstName: string;
      lastName: string;
    };
  };
};

export type PracticalLessonExportPayload = {
  formatVersion: typeof IMPORT_EXPORT_FORMAT_VERSION;
  entity: (typeof IMPORT_EXPORT_ENTITIES)[number];
  exportedAt: string;
  rows: PracticalLessonExportRow[];
};

const CSV_LINE_ENDING = "\n";
const TIME_RE = /^(\d{1,2}):(\d{2})$/;

function parseTimeToMinutes(time: string): number | null {
  const match = TIME_RE.exec(time.trim());
  if (!match) return null;
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Derive duration from start/end times when end exists; otherwise use stored value. */
export function calculateExportDurationMinutes(input: {
  startTime: string;
  endTime: string | null;
  storedDurationMinutes: number | null | undefined;
}): number | null {
  if (input.endTime?.trim()) {
    const startMinutes = parseTimeToMinutes(input.startTime);
    const endMinutes = parseTimeToMinutes(input.endTime);
    if (startMinutes === null || endMinutes === null) {
      return input.storedDurationMinutes ?? null;
    }
    let delta = endMinutes - startMinutes;
    if (delta < 0) {
      delta += 24 * 60;
    }
    return delta;
  }
  return input.storedDurationMinutes ?? null;
}

function formatInstructorName(user: {
  firstName: string;
  lastName: string;
}): string | null {
  const name = [user.firstName, user.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return name || null;
}

export function mapPracticalLessonToExportRow(
  lesson: PracticalLessonExportSource,
): PracticalLessonExportRow {
  const user = lesson.instructor.user;
  return {
    schoolStudentId: lesson.student?.schoolStudentId ?? "",
    practicalLessonNumber: lesson.practicalLessonNumber,
    lessonDate: formatExportDate(lesson.lessonDate),
    startTime: lesson.startTime,
    durationMinutes: calculateExportDurationMinutes({
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      storedDurationMinutes: lesson.durationMinutes,
    }),
    instructorEmail: user.email ?? null,
    instructorName: formatInstructorName(user),
    lessonSource: lesson.lessonSource,
    status: lesson.status,
    notes: lesson.adminNotes,
  };
}

function exportRowToCsvCells(row: PracticalLessonExportRow): string[] {
  return [
    escapeCsvField(row.schoolStudentId),
    escapeCsvField(row.practicalLessonNumber ?? ""),
    escapeCsvField(row.lessonDate),
    escapeCsvField(row.startTime),
    escapeCsvField(row.durationMinutes ?? ""),
    escapeCsvField(row.instructorEmail ?? ""),
    escapeCsvField(row.instructorName ?? ""),
    escapeCsvField(row.lessonSource),
    escapeCsvField(row.status),
    escapeCsvField(row.notes ?? ""),
  ];
}

export function serializePracticalLessonExportRowsToCsv(
  rows: PracticalLessonExportRow[],
): string {
  const header = PRACTICAL_LESSON_EXPORT_CSV_HEADERS.join(
    RECOMMENDED_CSV_DELIMITER,
  );
  const dataLines = rows.map((row) =>
    exportRowToCsvCells(row).join(RECOMMENDED_CSV_DELIMITER),
  );
  return [header, ...dataLines].join(CSV_LINE_ENDING);
}

export function buildPracticalLessonExportPayload(
  rows: PracticalLessonExportRow[],
  exportedAt: Date = new Date(),
): PracticalLessonExportPayload {
  return {
    formatVersion: IMPORT_EXPORT_FORMAT_VERSION,
    entity: "practicalLessons",
    exportedAt: exportedAt.toISOString(),
    rows,
  };
}
