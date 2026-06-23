import { describe, it, expect } from "vitest";
import { createInvitationBodySchema } from "./invitation-validation";

describe("createInvitationBodySchema", () => {
  it("does not require license fields for STUDENT", () => {
    const result = createInvitationBodySchema.safeParse({
      email: "student@school.test",
      role: "STUDENT",
    });
    expect(result.success).toBe(true);
  });

  it("rejects license fields on STUDENT invitations", () => {
    const result = createInvitationBodySchema.safeParse({
      email: "student@school.test",
      role: "STUDENT",
      instructorLicenseNumber: "LIC-1",
      instructorLicenseExpiry: "2027-06-15",
    });
    expect(result.success).toBe(false);
  });

  it("requires license fields for INSTRUCTOR", () => {
    const result = createInvitationBodySchema.safeParse({
      email: "instructor@school.test",
      role: "INSTRUCTOR",
    });
    expect(result.success).toBe(false);
  });

  it("rejects past license expiry for INSTRUCTOR", () => {
    const result = createInvitationBodySchema.safeParse({
      email: "instructor@school.test",
      role: "INSTRUCTOR",
      instructorLicenseNumber: "LIC-1",
      instructorLicenseExpiry: "2020-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid INSTRUCTOR invitation payload", () => {
    const result = createInvitationBodySchema.safeParse({
      email: "instructor@school.test",
      role: "INSTRUCTOR",
      instructorLicenseNumber: "LIC-12345",
      instructorLicenseExpiry: "2027-06-15",
    });
    expect(result.success).toBe(true);
  });
});
