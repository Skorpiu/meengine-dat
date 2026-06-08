import { describe, expect, it } from "vitest";
import type { StudentSchoolIdSource } from "@prisma/client";
import {
  mapStudentRecordDto,
  type StudentRecordRow,
} from "@/lib/students/student-record-dto";

describe("mapStudentRecordDto", () => {
  const baseRow: StudentRecordRow = {
    id: "stu-1",
    userId: null,
    firstName: "Ana",
    lastName: "Silva",
    email: "ana@school.test",
    phoneNumber: null,
    address: null,
    schoolStudentId: "26001",
    schoolStudentYearSuffix: "26",
    schoolStudentSequence: 1,
    schoolStudentIdSource: "MANUAL" satisfies StudentSchoolIdSource,
    enrollmentDate: new Date("2026-05-29T10:00:00.000Z"),
    appAccessMode: "MANUAL_ONLY" as const,
    category: { id: 2, name: "B" },
    transmissionType: { id: 3, name: "Automatic" },
    createdAt: new Date("2026-05-29T10:00:00.000Z"),
    updatedAt: new Date("2026-05-29T10:00:00.000Z"),
    user: null,
    userInvitations: [],
  };

  it("maps category and transmissionType from Student profile", () => {
    const dto = mapStudentRecordDto(baseRow);
    expect(dto.category).toEqual({ id: 2, name: "B" });
    expect(dto.transmissionType).toEqual({ id: 3, name: "Automatic" });
  });

  it("maps address from Student row", () => {
    const dto = mapStudentRecordDto({
      ...baseRow,
      address: "Rua A 1",
    });
    expect(dto.address).toBe("Rua A 1");
  });

  it("maps null category and transmission when unset", () => {
    const dto = mapStudentRecordDto({
      ...baseRow,
      category: null,
      transmissionType: null,
    });
    expect(dto.category).toBeNull();
    expect(dto.transmissionType).toBeNull();
  });
});
