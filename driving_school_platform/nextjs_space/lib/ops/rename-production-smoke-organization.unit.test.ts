import { describe, it, expect } from "vitest";
import {
  PRODUCTION_SMOKE_ORGANIZATION_TARGET_NAME,
  decideProductionSmokeOrganizationRename,
  isAllowedProductionSmokeCurrentName,
  normalizeOrganizationHost,
} from "./rename-production-smoke-organization";

const ORG_ID = "cmltn7vdl0000f8c4vxy6gcwx";

function baseOrganization(name: string) {
  return {
    id: ORG_ID,
    name,
    domains: [{ host: "www.meengine.io" }],
    userCount: 12,
  };
}

describe("normalizeOrganizationHost", () => {
  it("normalizes host values", () => {
    expect(normalizeOrganizationHost("https://WWW.MeEngine.IO/path")).toBe(
      "www.meengine.io",
    );
  });
});

describe("isAllowedProductionSmokeCurrentName", () => {
  it("accepts canonical legacy and target names", () => {
    expect(isAllowedProductionSmokeCurrentName("A Conquistadora")).toBe(true);
    expect(isAllowedProductionSmokeCurrentName("Conquistadora")).toBe(true);
    expect(
      isAllowedProductionSmokeCurrentName(
        PRODUCTION_SMOKE_ORGANIZATION_TARGET_NAME,
      ),
    ).toBe(true);
  });

  it("accepts explicit expected current name", () => {
    expect(
      isAllowedProductionSmokeCurrentName(
        "Legacy Smoke Org",
        "Legacy Smoke Org",
      ),
    ).toBe(true);
  });

  it("rejects unexpected names", () => {
    expect(isAllowedProductionSmokeCurrentName("Real Client School")).toBe(
      false,
    );
  });
});

describe("decideProductionSmokeOrganizationRename", () => {
  it("requires organization id", () => {
    expect(
      decideProductionSmokeOrganizationRename({
        organizationIdEnv: undefined,
        expectedHostEnv: "www.meengine.io",
        applyMode: false,
        organization: baseOrganization("A Conquistadora"),
      }),
    ).toEqual({
      action: "refuse",
      reason: "DAT_SMOKE_ORG_ID is required",
    });
  });

  it("requires expected host", () => {
    expect(
      decideProductionSmokeOrganizationRename({
        organizationIdEnv: ORG_ID,
        expectedHostEnv: undefined,
        applyMode: false,
        organization: baseOrganization("A Conquistadora"),
      }),
    ).toEqual({
      action: "refuse",
      reason: "DAT_SMOKE_EXPECTED_HOST is required",
    });
  });

  it("refuses when host does not match", () => {
    expect(
      decideProductionSmokeOrganizationRename({
        organizationIdEnv: ORG_ID,
        expectedHostEnv: "other.example.com",
        applyMode: false,
        organization: baseOrganization("A Conquistadora"),
      }),
    ).toEqual({
      action: "refuse",
      reason: "Expected host other.example.com not found on organization",
    });
  });

  it("refuses unexpected current names", () => {
    expect(
      decideProductionSmokeOrganizationRename({
        organizationIdEnv: ORG_ID,
        expectedHostEnv: "www.meengine.io",
        applyMode: false,
        organization: baseOrganization("Another School"),
      }),
    ).toEqual({
      action: "refuse",
      reason: "Unexpected current organization name: Another School",
    });
  });

  it("returns noop when already renamed", () => {
    expect(
      decideProductionSmokeOrganizationRename({
        organizationIdEnv: ORG_ID,
        expectedHostEnv: "www.meengine.io",
        applyMode: true,
        organization: baseOrganization(
          PRODUCTION_SMOKE_ORGANIZATION_TARGET_NAME,
        ),
      }),
    ).toEqual({
      action: "noop",
      reason: "Organization already has the canonical smoke name",
      currentName: PRODUCTION_SMOKE_ORGANIZATION_TARGET_NAME,
    });
  });

  it("defaults to dry-run rename plan", () => {
    expect(
      decideProductionSmokeOrganizationRename({
        organizationIdEnv: ORG_ID,
        expectedHostEnv: "www.meengine.io",
        applyMode: false,
        organization: baseOrganization("A Conquistadora"),
      }),
    ).toEqual({
      action: "dry-run",
      currentName: "A Conquistadora",
      targetName: PRODUCTION_SMOKE_ORGANIZATION_TARGET_NAME,
    });
  });

  it("allows apply mode when guards pass", () => {
    expect(
      decideProductionSmokeOrganizationRename({
        organizationIdEnv: ORG_ID,
        expectedHostEnv: "www.meengine.io",
        applyMode: true,
        organization: baseOrganization("Conquistadora"),
      }),
    ).toEqual({
      action: "apply",
      currentName: "Conquistadora",
      targetName: PRODUCTION_SMOKE_ORGANIZATION_TARGET_NAME,
    });
  });
});
