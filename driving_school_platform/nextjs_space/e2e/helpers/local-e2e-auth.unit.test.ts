import { describe, expect, it } from "vitest";

import { isEstablishedLocalE2eSessionUser } from "./local-e2e-auth";

describe("isEstablishedLocalE2eSessionUser", () => {
  it("accepts a role/org-complete authenticated session user", () => {
    expect(
      isEstablishedLocalE2eSessionUser(
        {
          email: "admin.e2e@dat.local",
          role: "SUPER_ADMIN",
          organizationId: "00000000-0000-4000-8000-000000000001",
        },
        "SUPER_ADMIN",
      ),
    ).toBe(true);
  });

  it("rejects missing organizationId", () => {
    expect(
      isEstablishedLocalE2eSessionUser(
        {
          email: "admin.e2e@dat.local",
          role: "SUPER_ADMIN",
          organizationId: null,
        },
        "SUPER_ADMIN",
      ),
    ).toBe(false);
  });

  it("rejects role mismatch", () => {
    expect(
      isEstablishedLocalE2eSessionUser(
        {
          email: "instructor.e2e@dat.local",
          role: "INSTRUCTOR",
          organizationId: "00000000-0000-4000-8000-000000000001",
        },
        "SUPER_ADMIN",
      ),
    ).toBe(false);
  });
});
