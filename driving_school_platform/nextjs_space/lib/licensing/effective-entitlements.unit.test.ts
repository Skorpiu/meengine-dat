import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findManyMock = vi.fn();
  const findUniqueMock = vi.fn();
  const grantFindManyMock = vi.fn();

  const prismaMock = {
    organizationFeature: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
    },
    entitlementGrant: {
      findMany: grantFindManyMock,
    },
  };

  return { prismaMock, findManyMock, findUniqueMock, grantFindManyMock };
});

vi.mock("@/lib/db", () => ({
  db: h.prismaMock,
}));

import {
  getEnabledFeatureKeysForOrganization,
  isFeatureEnabledForOrganization,
  resolveEffectiveEntitlements,
} from "./effective-entitlements";

describe("effective-entitlements resolver (canonical)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    h.grantFindManyMock.mockResolvedValue([]);
  });

  it("getEnabledFeatureKeysForOrganization returns raw DB keys (no validation)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T12:00:00.000Z"));

    h.findManyMock.mockResolvedValue([
      { featureKey: "VEHICLE_MANAGEMENT" },
      { featureKey: "NOT_A_REAL_KEY" },
    ]);

    const keys = await getEnabledFeatureKeysForOrganization("org1");
    expect(keys).toEqual(["VEHICLE_MANAGEMENT", "NOT_A_REAL_KEY"]);

    expect(h.findManyMock).toHaveBeenCalledWith({
      where: { organizationId: "org1", isEnabled: true },
      select: { featureKey: true },
    });

    expect(h.grantFindManyMock).toHaveBeenCalledWith({
      where: {
        organizationId: "org1",
        startsAt: { lte: new Date("2026-05-01T12:00:00.000Z") },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date("2026-05-01T12:00:00.000Z") } },
        ],
      },
      select: { featureKey: true, startsAt: true, expiresAt: true },
    });

    vi.useRealTimers();
  });

  it("isFeatureEnabledForOrganization returns false when missing", async () => {
    h.findManyMock.mockResolvedValue([]);
    h.grantFindManyMock.mockResolvedValue([]);

    const enabled = await isFeatureEnabledForOrganization(
      "org1",
      "VEHICLE_MANAGEMENT",
    );
    expect(enabled).toBe(false);
  });

  it("isFeatureEnabledForOrganization returns value from DB", async () => {
    h.findManyMock.mockResolvedValue([{ featureKey: "VEHICLE_MANAGEMENT" }]);

    const enabled = await isFeatureEnabledForOrganization(
      "org1",
      "VEHICLE_MANAGEMENT",
    );
    expect(enabled).toBe(true);
  });
});

describe("effective-entitlements temporal grant logic (pure)", () => {
  it("active grant counts", () => {
    const now = new Date("2026-05-01T12:00:00.000Z");
    const out = resolveEffectiveEntitlements({
      now,
      manualEnabledFeatureKeys: [],
      grants: [
        {
          featureKey: "VEHICLE_MANAGEMENT",
          startsAt: new Date("2026-05-01T00:00:00.000Z"),
          expiresAt: new Date("2026-06-01T00:00:00.000Z"),
        },
      ],
    });
    expect(out).toEqual([
      {
        featureKey: "VEHICLE_MANAGEMENT",
        enabled: true,
        source: "entitlement_grant",
        expiresAt: new Date("2026-06-01T00:00:00.000Z"),
      },
    ]);
  });

  it("future grant does not count (caller must filter by startsAt)", () => {
    const now = new Date("2026-05-01T12:00:00.000Z");
    const out = resolveEffectiveEntitlements({
      now,
      manualEnabledFeatureKeys: [],
      grants: [
        {
          featureKey: "VEHICLE_MANAGEMENT",
          startsAt: new Date("2026-06-01T00:00:00.000Z"),
          expiresAt: new Date("2026-07-01T00:00:00.000Z"),
        },
      ],
    });
    expect(out).toEqual([]);
  });

  it("expired grant does not count (caller must filter by expiresAt)", () => {
    const now = new Date("2026-05-01T12:00:00.000Z");
    const out = resolveEffectiveEntitlements({
      now,
      manualEnabledFeatureKeys: [],
      grants: [
        {
          featureKey: "VEHICLE_MANAGEMENT",
          startsAt: new Date("2026-04-01T00:00:00.000Z"),
          expiresAt: new Date("2026-05-01T12:00:00.000Z"),
        },
      ],
    });
    expect(out).toEqual([]);
  });

  it("grant with null expiresAt counts when already started", () => {
    const now = new Date("2026-05-01T12:00:00.000Z");
    const out = resolveEffectiveEntitlements({
      now,
      manualEnabledFeatureKeys: [],
      grants: [
        {
          featureKey: "ADVANCED_REPORTING",
          startsAt: new Date("2026-05-01T00:00:00.000Z"),
          expiresAt: null,
        },
      ],
    });

    expect(out).toEqual([
      {
        featureKey: "ADVANCED_REPORTING",
        enabled: true,
        source: "entitlement_grant",
        expiresAt: null,
      },
    ]);
  });

  it("manual OrganizationFeature still counts and wins over grant", () => {
    const now = new Date("2026-05-01T12:00:00.000Z");
    const out = resolveEffectiveEntitlements({
      now,
      manualEnabledFeatureKeys: ["VEHICLE_MANAGEMENT"],
      grants: [
        {
          featureKey: "VEHICLE_MANAGEMENT",
          startsAt: new Date("2026-05-01T00:00:00.000Z"),
          expiresAt: new Date("2026-06-01T00:00:00.000Z"),
        },
      ],
    });

    expect(out).toEqual([
      {
        featureKey: "VEHICLE_MANAGEMENT",
        enabled: true,
        source: "organization_feature",
        expiresAt: null,
      },
    ]);
  });
});
