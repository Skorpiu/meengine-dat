import { describe, expect, it } from "vitest";

import {
  assertIntegrationCompatibilityRoles,
  type IntegrationCompatibilityRoleRow,
} from "@/lib/ops/integration-database-bootstrap";

function validRow(
  rolname: "anon" | "authenticated",
): IntegrationCompatibilityRoleRow {
  return {
    rolname,
    rolsuper: false,
    rolcreatedb: false,
    rolcreaterole: false,
    rolcanlogin: false,
    rolinherit: false,
    member_of: [],
  };
}

describe("integration compatibility role assertions", () => {
  it("accepts NOLOGIN anon and authenticated without elevation or membership", () => {
    expect(() =>
      assertIntegrationCompatibilityRoles(
        [validRow("anon"), validRow("authenticated")],
        [],
      ),
    ).not.toThrow();
  });

  it("refuses service_role", () => {
    expect(() =>
      assertIntegrationCompatibilityRoles(
        [validRow("anon"), validRow("authenticated")],
        ["service_role"],
      ),
    ).toThrow(/service_role/);
  });

  it("refuses a login-capable compatibility role", () => {
    expect(() =>
      assertIntegrationCompatibilityRoles(
        [{ ...validRow("anon"), rolcanlogin: true }, validRow("authenticated")],
        [],
      ),
    ).toThrow(/elevated attributes/);
  });

  it("refuses extra role membership", () => {
    expect(() =>
      assertIntegrationCompatibilityRoles(
        [
          { ...validRow("anon"), member_of: ["authenticated"] },
          validRow("authenticated"),
        ],
        [],
      ),
    ).toThrow(/extra membership/);
  });
});
