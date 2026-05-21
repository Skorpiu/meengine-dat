import { describe, it, expect } from "vitest";
import {
  isInvitableUserRole,
  normalizeInvitationEmail,
} from "./invitation-policy";

describe("invitation-policy", () => {
  it("normalizes email", () => {
    expect(normalizeInvitationEmail("  User@Example.COM ")).toBe(
      "user@example.com",
    );
  });

  it("accepts STUDENT and INSTRUCTOR only", () => {
    expect(isInvitableUserRole("STUDENT")).toBe(true);
    expect(isInvitableUserRole("INSTRUCTOR")).toBe(true);
    expect(isInvitableUserRole("SUPER_ADMIN")).toBe(false);
    expect(isInvitableUserRole("PLATFORM_ADMIN")).toBe(false);
  });
});
