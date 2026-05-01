import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const licenseKeyFindUniqueMock = vi.fn();
  const licenseKeyUpdateMock = vi.fn();
  const entitlementGrantCreateManyMock = vi.fn();
  const orgFeatureUpsertMock = vi.fn();
  const transactionMock = vi.fn();

  const prismaMock = {
    licenseKey: {
      findUnique: licenseKeyFindUniqueMock,
      update: licenseKeyUpdateMock,
    },
    entitlementGrant: {
      createMany: entitlementGrantCreateManyMock,
    },
    organizationFeature: {
      upsert: orgFeatureUpsertMock,
    },
    $transaction: transactionMock,
  };

  return {
    prismaMock,
    licenseKeyFindUniqueMock,
    licenseKeyUpdateMock,
    entitlementGrantCreateManyMock,
    orgFeatureUpsertMock,
    transactionMock,
  };
});

vi.mock("@/lib/db", () => ({
  db: h.prismaMock,
}));

import { LicenseService } from "./license-service";

describe("LicenseService.activateLicenseKey (entitlement grants)", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    h.transactionMock.mockImplementation(async (fn: any) => fn(h.prismaMock));
    h.entitlementGrantCreateManyMock.mockResolvedValue({ count: 0 });
    h.licenseKeyUpdateMock.mockResolvedValue({});
  });

  it("creates EntitlementGrant rows (not OrganizationFeature) and marks license as used", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T10:00:00.000Z"));

    h.licenseKeyFindUniqueMock.mockResolvedValue({
      id: "lic1",
      organizationId: "orgA",
      key: "LIC-TEST-123",
      featureKeys: ["VEHICLE_MANAGEMENT", "ADVANCED_REPORTING"],
      isActive: true,
      isUsed: false,
      expiresAt: new Date("2026-06-01T00:00:00.000Z"),
    });

    const res = await LicenseService.activateLicenseKey("orgA", "LIC-TEST-123");
    expect(res.success).toBe(true);
    expect(res.features).toEqual(["VEHICLE_MANAGEMENT", "ADVANCED_REPORTING"]);

    expect(h.orgFeatureUpsertMock).not.toHaveBeenCalled();

    expect(h.entitlementGrantCreateManyMock).toHaveBeenCalledWith({
      data: [
        {
          organizationId: "orgA",
          featureKey: "VEHICLE_MANAGEMENT",
          source: "LICENSE_KEY",
          startsAt: new Date("2026-05-01T10:00:00.000Z"),
          expiresAt: new Date("2026-06-01T00:00:00.000Z"),
        },
        {
          organizationId: "orgA",
          featureKey: "ADVANCED_REPORTING",
          source: "LICENSE_KEY",
          startsAt: new Date("2026-05-01T10:00:00.000Z"),
          expiresAt: new Date("2026-06-01T00:00:00.000Z"),
        },
      ],
    });

    expect(h.licenseKeyUpdateMock).toHaveBeenCalledWith({
      where: { id: "lic1" },
      data: { isUsed: true, usedAt: new Date("2026-05-01T10:00:00.000Z") },
    });

    vi.useRealTimers();
  });
});
