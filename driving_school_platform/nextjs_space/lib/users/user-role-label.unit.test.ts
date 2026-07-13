import { describe, it, expect } from "vitest";
import {
  getUserRoleLabel,
  getUserRoleLabelFromString,
} from "./user-role-label";

describe("getUserRoleLabel", () => {
  it("maps all persisted DAT roles to canonical product labels", () => {
    expect(getUserRoleLabel("SUPER_ADMIN")).toBe("School Admin");
    expect(getUserRoleLabel("PLATFORM_ADMIN")).toBe("Platform Admin");
    expect(getUserRoleLabel("INSTRUCTOR")).toBe("Instructor");
    expect(getUserRoleLabel("STUDENT")).toBe("Student");
  });
});

describe("getUserRoleLabelFromString", () => {
  it("maps known role strings", () => {
    expect(getUserRoleLabelFromString("SUPER_ADMIN")).toBe("School Admin");
    expect(getUserRoleLabelFromString("PLATFORM_ADMIN")).toBe("Platform Admin");
  });

  it("returns dash for empty values", () => {
    expect(getUserRoleLabelFromString(null)).toBe("—");
    expect(getUserRoleLabelFromString("  ")).toBe("—");
  });

  it("returns unknown values unchanged", () => {
    expect(getUserRoleLabelFromString("LEGACY_ROLE")).toBe("LEGACY_ROLE");
  });
});
