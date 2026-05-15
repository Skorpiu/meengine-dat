import { describe, it, expect } from "vitest";
import {
  isTenantAssignableUserRole,
  rejectForbiddenTenantUserRole,
  TENANT_ASSIGNABLE_USER_ROLES,
} from "./user-route-access";

describe("user-route-access", () => {
  it("defines tenant-assignable roles without PLATFORM_ADMIN", () => {
    expect(TENANT_ASSIGNABLE_USER_ROLES).not.toContain("PLATFORM_ADMIN");
    expect(isTenantAssignableUserRole("STUDENT")).toBe(true);
    expect(isTenantAssignableUserRole("PLATFORM_ADMIN")).toBe(false);
  });

  it("rejectForbiddenTenantUserRole returns 400 for PLATFORM_ADMIN", () => {
    const res = rejectForbiddenTenantUserRole("PLATFORM_ADMIN");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(400);
  });

  it("rejectForbiddenTenantUserRole allows tenant roles", () => {
    expect(rejectForbiddenTenantUserRole("INSTRUCTOR")).toBeNull();
  });
});
