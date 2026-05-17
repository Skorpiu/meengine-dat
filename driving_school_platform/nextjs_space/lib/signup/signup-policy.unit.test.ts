import { describe, it, expect } from "vitest";
import {
  decideSignupAvailability,
  isPublicSignupEnabled,
} from "./signup-policy";

describe("isPublicSignupEnabled", () => {
  it("returns false when PUBLIC_SIGNUP_ENABLED is undefined", () => {
    expect(isPublicSignupEnabled({})).toBe(false);
  });

  it('returns false when PUBLIC_SIGNUP_ENABLED is "false"', () => {
    expect(isPublicSignupEnabled({ PUBLIC_SIGNUP_ENABLED: "false" })).toBe(
      false,
    );
  });

  it('returns true when PUBLIC_SIGNUP_ENABLED is "TRUE"', () => {
    expect(isPublicSignupEnabled({ PUBLIC_SIGNUP_ENABLED: "TRUE" })).toBe(true);
  });

  it('returns true when PUBLIC_SIGNUP_ENABLED is " true "', () => {
    expect(isPublicSignupEnabled({ PUBLIC_SIGNUP_ENABLED: " true " })).toBe(
      true,
    );
  });
});

describe("decideSignupAvailability", () => {
  it("blocks demo org with demo_signup_disabled even when public signup is enabled", () => {
    const decision = decideSignupAvailability({
      isDemoOrganization: true,
      env: { PUBLIC_SIGNUP_ENABLED: "true" },
    });
    expect(decision).toEqual({
      allowed: false,
      code: "demo_signup_disabled",
      message: "Public signup is disabled for demo organizations.",
    });
  });

  it("blocks non-demo org when public signup is disabled", () => {
    const decision = decideSignupAvailability({
      isDemoOrganization: false,
      env: {},
    });
    expect(decision).toEqual({
      allowed: false,
      code: "public_signup_disabled",
      message: "Public signup is currently disabled.",
    });
  });

  it("allows non-demo org when public signup is enabled", () => {
    expect(
      decideSignupAvailability({
        isDemoOrganization: false,
        env: { PUBLIC_SIGNUP_ENABLED: "true" },
      }),
    ).toEqual({ allowed: true });
  });
});
