import { describe, it, expect } from "vitest";
import {
  filterInstructorRecordUsers,
  formatInstructorLicenseExpiry,
  getInstructorAppAccountStatusLabel,
  getInstructorRecordDisplayName,
  hasOperationalInstructorRecord,
} from "./instructor-record-ui-utils";
import type { InstructorRecordUserDto } from "./instructor-record-ui-types";

const baseInstructor = (
  overrides: Partial<InstructorRecordUserDto> = {},
): InstructorRecordUserDto => ({
  id: "user-1",
  email: "inst@school.test",
  firstName: "Ana",
  lastName: "Silva",
  phoneNumber: "+351912000000",
  role: "INSTRUCTOR",
  isApproved: true,
  instructor: {
    id: "inst-1",
    instructorLicenseNumber: "LIC-001",
    instructorLicenseExpiry: "2027-06-15",
  },
  ...overrides,
});

describe("filterInstructorRecordUsers", () => {
  it("returns only INSTRUCTOR role users", () => {
    const users: InstructorRecordUserDto[] = [
      baseInstructor(),
      { ...baseInstructor(), id: "user-2", role: "STUDENT" },
    ];
    expect(filterInstructorRecordUsers(users)).toHaveLength(1);
    expect(filterInstructorRecordUsers(users)[0].id).toBe("user-1");
  });
});

describe("getInstructorRecordDisplayName", () => {
  it("joins first and last name", () => {
    expect(getInstructorRecordDisplayName(baseInstructor())).toBe("Ana Silva");
  });

  it("falls back to email", () => {
    expect(
      getInstructorRecordDisplayName(
        baseInstructor({ firstName: "", lastName: "" }),
      ),
    ).toBe("inst@school.test");
  });
});

describe("formatInstructorLicenseExpiry", () => {
  it("formats valid ISO date", () => {
    expect(formatInstructorLicenseExpiry("2027-06-15")).not.toBe("—");
  });

  it("returns em dash for invalid", () => {
    expect(formatInstructorLicenseExpiry("not-a-date")).toBe("—");
  });
});

describe("getInstructorAppAccountStatusLabel", () => {
  it("maps approval state", () => {
    expect(getInstructorAppAccountStatusLabel(true)).toBe("App account active");
    expect(getInstructorAppAccountStatusLabel(false)).toBe(
      "App account pending approval",
    );
  });
});

describe("hasOperationalInstructorRecord", () => {
  it("is true when license fields exist", () => {
    expect(hasOperationalInstructorRecord(baseInstructor())).toBe(true);
  });

  it("is false without instructor row", () => {
    expect(
      hasOperationalInstructorRecord(baseInstructor({ instructor: null })),
    ).toBe(false);
  });
});
