import { describe, expect, it } from "vitest";
import {
  buildPracticalLessonExportPayload,
  calculateExportDurationMinutes,
  mapPracticalLessonToExportRow,
  serializePracticalLessonExportRowsToCsv,
  type PracticalLessonExportSource,
} from "@/lib/import-export/practical-lesson-export";
import {
  IMPORT_EXPORT_FORMAT_VERSION,
  PRACTICAL_LESSON_EXPORT_CSV_HEADERS,
} from "@/lib/import-export/import-export-contracts";

const baseLesson: PracticalLessonExportSource = {
  lessonDate: new Date("2026-05-29T12:00:00.000Z"),
  startTime: "09:00",
  endTime: "10:00",
  durationMinutes: 60,
  practicalLessonNumber: 3,
  lessonSource: "MANUAL",
  status: "COMPLETED",
  adminNotes: "Boa aula",
  student: { schoolStudentId: "26001" },
  instructor: {
    user: {
      email: "instrutor@school.test",
      firstName: "Ana",
      lastName: "Costa",
    },
  },
};

describe("calculateExportDurationMinutes", () => {
  it("derives duration from start and end times", () => {
    expect(
      calculateExportDurationMinutes({
        startTime: "09:00",
        endTime: "10:30",
        storedDurationMinutes: 60,
      }),
    ).toBe(90);
  });

  it("uses stored duration when end time is missing", () => {
    expect(
      calculateExportDurationMinutes({
        startTime: "09:00",
        endTime: null,
        storedDurationMinutes: 45,
      }),
    ).toBe(45);
  });

  it("returns null when neither end time nor stored duration exist", () => {
    expect(
      calculateExportDurationMinutes({
        startTime: "09:00",
        endTime: null,
        storedDurationMinutes: null,
      }),
    ).toBeNull();
  });

  it("handles overnight wrap when end is before start", () => {
    expect(
      calculateExportDurationMinutes({
        startTime: "23:00",
        endTime: "01:00",
        storedDurationMinutes: 60,
      }),
    ).toBe(120);
  });
});

describe("mapPracticalLessonToExportRow", () => {
  it("maps lesson fields and instructor contact data", () => {
    const row = mapPracticalLessonToExportRow(baseLesson);
    expect(row).toEqual({
      schoolStudentId: "26001",
      practicalLessonNumber: 3,
      lessonDate: "2026-05-29",
      startTime: "09:00",
      durationMinutes: 60,
      instructorEmail: "instrutor@school.test",
      instructorName: "Ana Costa",
      lessonSource: "MANUAL",
      status: "COMPLETED",
      notes: "Boa aula",
    });
  });

  it("uses empty schoolStudentId when student relation is missing", () => {
    const row = mapPracticalLessonToExportRow({
      ...baseLesson,
      student: null,
    });
    expect(row.schoolStudentId).toBe("");
  });
});

describe("serializePracticalLessonExportRowsToCsv", () => {
  it("includes export headers and escapes semicolons in notes", () => {
    const csv = serializePracticalLessonExportRowsToCsv([
      mapPracticalLessonToExportRow({
        ...baseLesson,
        adminNotes: "nota; com separador",
      }),
    ]);
    const [header, data] = csv.split("\n");
    expect(header).toBe(PRACTICAL_LESSON_EXPORT_CSV_HEADERS.join(";"));
    expect(data).toContain('"nota; com separador"');
    expect(data).toContain("26001;3;2026-05-29;09:00;60");
  });

  it("serializes null optional fields as empty cells", () => {
    const csv = serializePracticalLessonExportRowsToCsv([
      mapPracticalLessonToExportRow({
        ...baseLesson,
        practicalLessonNumber: null,
        adminNotes: null,
        endTime: null,
        durationMinutes: 0,
      }),
    ]);
    const data = csv.split("\n")[1];
    expect(data).toBe(
      "26001;;2026-05-29;09:00;0;instrutor@school.test;Ana Costa;MANUAL;COMPLETED;",
    );
  });
});

describe("buildPracticalLessonExportPayload", () => {
  it("builds JSON envelope with formatVersion 1 and entity practicalLessons", () => {
    const exportedAt = new Date("2026-05-29T10:00:00.000Z");
    const payload = buildPracticalLessonExportPayload(
      [mapPracticalLessonToExportRow(baseLesson)],
      exportedAt,
    );
    expect(payload.formatVersion).toBe(IMPORT_EXPORT_FORMAT_VERSION);
    expect(payload.entity).toBe("practicalLessons");
    expect(payload.exportedAt).toBe("2026-05-29T10:00:00.000Z");
    expect(payload.rows[0]?.schoolStudentId).toBe("26001");
  });
});
