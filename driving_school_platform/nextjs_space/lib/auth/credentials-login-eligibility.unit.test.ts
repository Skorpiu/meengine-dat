import { describe, it, expect } from "vitest";
import { getCredentialsLoginBlockReason } from "./credentials-login-eligibility";

describe("getCredentialsLoginBlockReason", () => {
  it("blocks non-approved instructor", () => {
    expect(
      getCredentialsLoginBlockReason({
        role: "INSTRUCTOR",
        isApproved: false,
      }),
    ).toBe("not_approved");
  });

  it("blocks non-approved student", () => {
    expect(
      getCredentialsLoginBlockReason({
        role: "STUDENT",
        isApproved: false,
      }),
    ).toBe("not_approved");
  });

  it("allows approved instructor", () => {
    expect(
      getCredentialsLoginBlockReason({
        role: "INSTRUCTOR",
        isApproved: true,
      }),
    ).toBeNull();
  });

  it("allows SUPER_ADMIN regardless of isApproved", () => {
    expect(
      getCredentialsLoginBlockReason({
        role: "SUPER_ADMIN",
        isApproved: false,
      }),
    ).toBeNull();
  });
});
