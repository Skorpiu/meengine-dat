import { describe, expect, it } from "vitest";
import {
  DEMO_TIER_PROFILES,
  getDemoTierProfile,
  parseDemoTierProfileId,
} from "./demo-tier-profiles";

const VEHICLE_KEY = "VEHICLE_MANAGEMENT";

describe("demo-tier-profiles", () => {
  it("defines basic, premium, and full-showcase profiles", () => {
    expect(DEMO_TIER_PROFILES.basic.id).toBe("basic");
    expect(DEMO_TIER_PROFILES.premium.id).toBe("premium");
    expect(DEMO_TIER_PROFILES["full-showcase"].id).toBe("full-showcase");
  });

  it("basic has no premium showcase feature keys", () => {
    expect(DEMO_TIER_PROFILES.basic.featureKeys).toEqual([]);
    expect(DEMO_TIER_PROFILES.basic.featureKeys).not.toContain(VEHICLE_KEY);
  });

  it("premium includes vehicle management (vehicles module)", () => {
    expect(DEMO_TIER_PROFILES.premium.featureKeys).toContain(VEHICLE_KEY);
  });

  it("full-showcase includes vehicle management (vehicles module)", () => {
    expect(DEMO_TIER_PROFILES["full-showcase"].featureKeys).toContain(
      VEHICLE_KEY,
    );
  });

  it("parseDemoTierProfileId accepts valid ids", () => {
    expect(parseDemoTierProfileId("basic")).toBe("basic");
    expect(parseDemoTierProfileId("premium")).toBe("premium");
    expect(parseDemoTierProfileId("full-showcase")).toBe("full-showcase");
    expect(parseDemoTierProfileId("  PREMIUM  ")).toBe("premium");
  });

  it("parseDemoTierProfileId rejects invalid values", () => {
    expect(parseDemoTierProfileId("")).toBeNull();
    expect(parseDemoTierProfileId("invalid")).toBeNull();
    expect(parseDemoTierProfileId("full_showcase")).toBeNull();
    expect(parseDemoTierProfileId("basic-extra")).toBeNull();
  });

  it("getDemoTierProfile returns the profile for each id", () => {
    expect(getDemoTierProfile("basic")).toBe(DEMO_TIER_PROFILES.basic);
    expect(getDemoTierProfile("premium")).toBe(DEMO_TIER_PROFILES.premium);
    expect(getDemoTierProfile("full-showcase")).toBe(
      DEMO_TIER_PROFILES["full-showcase"],
    );
  });
});
