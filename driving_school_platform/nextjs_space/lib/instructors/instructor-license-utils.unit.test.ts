import { describe, it, expect } from "vitest";
import {
  isInvitePendingInstructorLicenseNumber,
  isInstructorLicenseExpiryTodayOrFuture,
  normalizeInstructorLicenseNumber,
  parseInstructorLicenseExpiryDate,
} from "./instructor-license-utils";

describe("isInvitePendingInstructorLicenseNumber", () => {
  it("returns true for INVITE-PENDING prefix", () => {
    expect(
      isInvitePendingInstructorLicenseNumber("INVITE-PENDING-cmqqq1l1"),
    ).toBe(true);
  });

  it("returns false for real license numbers", () => {
    expect(isInvitePendingInstructorLicenseNumber("LIC-12345")).toBe(false);
  });

  it("returns false for null/empty", () => {
    expect(isInvitePendingInstructorLicenseNumber(null)).toBe(false);
    expect(isInvitePendingInstructorLicenseNumber("  ")).toBe(false);
  });
});

describe("normalizeInstructorLicenseNumber", () => {
  it("trims whitespace", () => {
    expect(normalizeInstructorLicenseNumber("  LIC-1  ")).toBe("LIC-1");
  });
});

describe("isInstructorLicenseExpiryTodayOrFuture", () => {
  it("accepts today and future dates", () => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    expect(isInstructorLicenseExpiryTodayOrFuture(todayStr)).toBe(true);
    expect(isInstructorLicenseExpiryTodayOrFuture("2099-12-31")).toBe(true);
  });

  it("rejects past dates", () => {
    expect(isInstructorLicenseExpiryTodayOrFuture("2020-01-01")).toBe(false);
  });

  it("rejects invalid dates", () => {
    expect(isInstructorLicenseExpiryTodayOrFuture("not-a-date")).toBe(false);
  });
});

describe("parseInstructorLicenseExpiryDate", () => {
  it("parses valid ISO date strings", () => {
    const parsed = parseInstructorLicenseExpiryDate("2027-06-15");
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.getFullYear()).toBe(2027);
  });
});
