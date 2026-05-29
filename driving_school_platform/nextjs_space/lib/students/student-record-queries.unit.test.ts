import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import {
  buildStudentRecordListWhere,
  clampStudentListLimit,
  isStudentSchoolIdConflict,
} from "./student-record-queries";

describe("clampStudentListLimit", () => {
  it("defaults to 50", () => {
    expect(clampStudentListLimit()).toBe(50);
  });

  it("caps at 100", () => {
    expect(clampStudentListLimit(500)).toBe(100);
  });
});

describe("buildStudentRecordListWhere", () => {
  it("scopes by organizationId", () => {
    const where = buildStudentRecordListWhere({ organizationId: "org-a" });
    expect(where.organizationId).toBe("org-a");
    expect(where.OR).toBeUndefined();
  });

  it("adds normalized schoolStudentId for numeric search 261", () => {
    const where = buildStudentRecordListWhere({
      organizationId: "org-a",
      search: "261",
    });
    expect(where.OR).toEqual(
      expect.arrayContaining([{ schoolStudentId: "26001" }]),
    );
  });

  it("filters by appAccessMode", () => {
    const where = buildStudentRecordListWhere({
      organizationId: "org-a",
      appAccessMode: "MANUAL_ONLY",
    });
    expect(where.appAccessMode).toBe("MANUAL_ONLY");
  });

  it("includes text search fields for name", () => {
    const where = buildStudentRecordListWhere({
      organizationId: "org-a",
      search: "Silva",
    });
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { firstName: { contains: "Silva", mode: "insensitive" } },
      ]),
    );
  });
});

describe("isStudentSchoolIdConflict", () => {
  it("returns true for P2002 on organizationId + schoolStudentId", () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint",
      {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["organizationId", "schoolStudentId"] },
      },
    );
    expect(isStudentSchoolIdConflict(error)).toBe(true);
  });

  it("returns false for P2002 on other unique fields", () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint",
      {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["studentIdNumber"] },
      },
    );
    expect(isStudentSchoolIdConflict(error)).toBe(false);
  });
});
