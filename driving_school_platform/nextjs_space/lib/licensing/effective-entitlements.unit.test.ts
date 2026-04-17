import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findManyMock = vi.fn();
  const findUniqueMock = vi.fn();

  const prismaMock = {
    organizationFeature: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
    },
  };

  return { prismaMock, findManyMock, findUniqueMock };
});

vi.mock("@/lib/db", () => ({
  db: h.prismaMock,
}));

import {
  getEnabledFeatureKeysForOrganization,
  isFeatureEnabledForOrganization,
} from "./effective-entitlements";

describe("effective-entitlements resolver (canonical)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("getEnabledFeatureKeysForOrganization returns raw DB keys (no validation)", async () => {
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
  });

  it("isFeatureEnabledForOrganization returns false when missing", async () => {
    h.findUniqueMock.mockResolvedValue(null);

    const enabled = await isFeatureEnabledForOrganization(
      "org1",
      "VEHICLE_MANAGEMENT",
    );
    expect(enabled).toBe(false);
  });

  it("isFeatureEnabledForOrganization returns value from DB", async () => {
    h.findUniqueMock.mockResolvedValue({ isEnabled: true });

    const enabled = await isFeatureEnabledForOrganization(
      "org1",
      "VEHICLE_MANAGEMENT",
    );
    expect(enabled).toBe(true);

    expect(h.findUniqueMock).toHaveBeenCalledWith({
      where: {
        organizationId_featureKey: {
          organizationId: "org1",
          featureKey: "VEHICLE_MANAGEMENT",
        },
      },
    });
  });
});
