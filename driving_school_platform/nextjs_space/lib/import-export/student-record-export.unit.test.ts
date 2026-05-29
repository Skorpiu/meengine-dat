import { describe, expect, it } from "vitest";
import {
  buildStudentExportPayload,
  escapeCsvField,
  formatExportDate,
  mapStudentToExportRow,
  serializeStudentExportRowsToCsv,
  type StudentRecordExportSource,
} from "@/lib/import-export/student-record-export";
import {
  IMPORT_EXPORT_FORMAT_VERSION,
  STUDENT_EXPORT_CSV_HEADERS,
} from "@/lib/import-export/import-export-contracts";

const baseStudent: StudentRecordExportSource = {
  schoolStudentId: "26001",
  schoolStudentYearSuffix: "26",
  schoolStudentSequence: 1,
  firstName: "João",
  lastName: "Silva",
  phoneNumber: "912345678",
  email: "joao@example.com",
  enrollmentDate: new Date("2026-05-29T12:00:00.000Z"),
  appAccessMode: "MANUAL_ONLY",
};

describe("escapeCsvField", () => {
  it("returns plain text unchanged", () => {
    expect(escapeCsvField("João Silva")).toBe("João Silva");
  });

  it("wraps values containing semicolon", () => {
    expect(escapeCsvField("a;b")).toBe('"a;b"');
  });

  it("escapes double quotes", () => {
    expect(escapeCsvField('say "hello"')).toBe('"say ""hello"""');
  });

  it("wraps values containing newline", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("returns empty string for null/undefined", () => {
    expect(escapeCsvField(null)).toBe("");
    expect(escapeCsvField(undefined)).toBe("");
  });
});

describe("mapStudentToExportRow", () => {
  it("maps fields and formats enrollmentDate as YYYY-MM-DD", () => {
    const row = mapStudentToExportRow(baseStudent);
    expect(row).toEqual({
      schoolStudentId: "26001",
      yearSuffix: "26",
      sequence: 1,
      firstName: "João",
      lastName: "Silva",
      phoneNumber: "912345678",
      email: "joao@example.com",
      enrollmentDate: "2026-05-29",
      appAccessMode: "MANUAL_ONLY",
    });
  });

  it("uses empty strings and null for missing school id parts", () => {
    const row = mapStudentToExportRow({
      ...baseStudent,
      schoolStudentId: null,
      schoolStudentYearSuffix: null,
      schoolStudentSequence: null,
      enrollmentDate: null,
    });
    expect(row.schoolStudentId).toBe("");
    expect(row.yearSuffix).toBe("");
    expect(row.sequence).toBeNull();
    expect(row.enrollmentDate).toBeNull();
  });
});

describe("formatExportDate", () => {
  it("formats ISO calendar date", () => {
    expect(formatExportDate(new Date("2026-05-29T23:59:59.000Z"))).toBe(
      "2026-05-29",
    );
  });

  it("returns empty string for null", () => {
    expect(formatExportDate(null)).toBe("");
  });
});

describe("serializeStudentExportRowsToCsv", () => {
  it("includes export headers and semicolon-separated values", () => {
    const csv = serializeStudentExportRowsToCsv([
      mapStudentToExportRow(baseStudent),
    ]);
    const [header, data] = csv.split("\n");
    expect(header).toBe(STUDENT_EXPORT_CSV_HEADERS.join(";"));
    expect(data).toBe(
      "26001;26;1;João;Silva;912345678;joao@example.com;2026-05-29;MANUAL_ONLY",
    );
  });

  it("serializes null contact fields as empty cells", () => {
    const csv = serializeStudentExportRowsToCsv([
      mapStudentToExportRow({
        ...baseStudent,
        lastName: null,
        phoneNumber: null,
        email: null,
        enrollmentDate: null,
      }),
    ]);
    const data = csv.split("\n")[1];
    expect(data).toBe("26001;26;1;João;;;;;MANUAL_ONLY");
  });

  it("serializes null sequence as empty CSV cell", () => {
    const csv = serializeStudentExportRowsToCsv([
      mapStudentToExportRow({
        ...baseStudent,
        schoolStudentId: null,
        schoolStudentYearSuffix: null,
        schoolStudentSequence: null,
      }),
    ]);
    const data = csv.split("\n")[1];
    expect(data).toBe(
      ";;;João;Silva;912345678;joao@example.com;2026-05-29;MANUAL_ONLY",
    );
  });
});

describe("buildStudentExportPayload", () => {
  it("builds JSON envelope with formatVersion 1 and entity students", () => {
    const exportedAt = new Date("2026-05-29T10:00:00.000Z");
    const payload = buildStudentExportPayload(
      [mapStudentToExportRow(baseStudent)],
      exportedAt,
    );
    expect(payload.formatVersion).toBe(IMPORT_EXPORT_FORMAT_VERSION);
    expect(payload.entity).toBe("students");
    expect(payload.exportedAt).toBe("2026-05-29T10:00:00.000Z");
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0].schoolStudentId).toBe("26001");
  });
});
