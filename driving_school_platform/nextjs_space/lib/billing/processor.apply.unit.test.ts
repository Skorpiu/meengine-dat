import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyBillingProjectionForOrganization } from "./processor";

describe("billing processor apply (subscription -> org patch + entitlement grants)", () => {
  const orgUpdateMock = vi.fn();
  const grantCreateManyMock = vi.fn();
  const grantUpdateManyMock = vi.fn();

  const tx = {
    organization: {
      update: orgUpdateMock,
    },
    entitlementGrant: {
      createMany: grantCreateManyMock,
      updateMany: grantUpdateManyMock,
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    orgUpdateMock.mockResolvedValue({});
    grantCreateManyMock.mockResolvedValue({ count: 0 });
    grantUpdateManyMock.mockResolvedValue({ count: 0 });
  });

  it("updates subscription fields and creates BILLING EntitlementGrant rows for plan features", async () => {
    const occurredAt = new Date("2026-05-01T00:00:00.000Z");
    const periodStart = new Date("2026-04-01T00:00:00.000Z");
    const periodEnd = new Date("2026-06-01T00:00:00.000Z");

    await applyBillingProjectionForOrganization(tx, {
      organizationId: "orgA",
      occurredAt,
      projection: {
        subscriptionPatch: {
          status: "ACTIVE",
          planKey: "PREMIUM",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
        entitlementsDelta: {
          enableFeatureKeys: ["VEHICLE_MANAGEMENT", "LESSON_MANAGEMENT"],
          disableFeatureKeys: [],
        },
      },
    });

    expect(orgUpdateMock).toHaveBeenCalledWith({
      where: { id: "orgA" },
      data: {
        subscriptionTier: "PREMIUM",
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: periodEnd,
      },
    });

    expect(grantCreateManyMock).toHaveBeenCalledWith({
      data: [
        {
          organizationId: "orgA",
          featureKey: "VEHICLE_MANAGEMENT",
          source: "BILLING",
          startsAt: periodStart,
          expiresAt: periodEnd,
        },
        {
          organizationId: "orgA",
          featureKey: "LESSON_MANAGEMENT",
          source: "BILLING",
          startsAt: periodStart,
          expiresAt: periodEnd,
        },
      ],
    });
    expect(grantUpdateManyMock).not.toHaveBeenCalled();
  });

  it("falls back to occurredAt when currentPeriodStart is missing", async () => {
    const occurredAt = new Date("2026-05-01T00:00:00.000Z");
    const periodEnd = new Date("2026-06-01T00:00:00.000Z");

    await applyBillingProjectionForOrganization(tx, {
      organizationId: "orgA",
      occurredAt,
      projection: {
        subscriptionPatch: {
          status: "ACTIVE",
          planKey: "PREMIUM",
          currentPeriodEnd: periodEnd,
        },
        entitlementsDelta: {
          enableFeatureKeys: ["VEHICLE_MANAGEMENT"],
          disableFeatureKeys: [],
        },
      },
    });

    expect(grantCreateManyMock).toHaveBeenCalledWith({
      data: [
        {
          organizationId: "orgA",
          featureKey: "VEHICLE_MANAGEMENT",
          source: "BILLING",
          startsAt: occurredAt,
          expiresAt: periodEnd,
        },
      ],
    });
    expect(grantUpdateManyMock).not.toHaveBeenCalled();
  });

  it("expires active BILLING grants for terminal subscription events (CANCELLED)", async () => {
    const occurredAt = new Date("2026-05-01T00:00:00.000Z");

    await applyBillingProjectionForOrganization(tx, {
      organizationId: "orgA",
      occurredAt,
      projection: {
        subscriptionPatch: {
          status: "CANCELLED",
          planKey: "PREMIUM",
          currentPeriodEnd: null,
        },
        entitlementsDelta: {
          enableFeatureKeys: ["VEHICLE_MANAGEMENT"],
          disableFeatureKeys: ["VEHICLE_MANAGEMENT"],
        },
      },
    });

    expect(orgUpdateMock).toHaveBeenCalledTimes(1);
    expect(grantCreateManyMock).not.toHaveBeenCalled();
    expect(grantUpdateManyMock).toHaveBeenCalledWith({
      where: {
        organizationId: "orgA",
        source: "BILLING",
        featureKey: { in: ["VEHICLE_MANAGEMENT"] },
        startsAt: { lte: occurredAt },
        OR: [{ expiresAt: null }, { expiresAt: { gt: occurredAt } }],
      },
      data: { expiresAt: occurredAt },
    });
  });

  it("does not expire grants when disableFeatureKeys is empty", async () => {
    const occurredAt = new Date("2026-05-01T00:00:00.000Z");

    await applyBillingProjectionForOrganization(tx, {
      organizationId: "orgA",
      occurredAt,
      projection: {
        subscriptionPatch: {
          status: "EXPIRED",
          planKey: "PREMIUM",
          currentPeriodEnd: null,
        },
        entitlementsDelta: {
          enableFeatureKeys: [],
          disableFeatureKeys: [],
        },
      },
    });

    expect(grantUpdateManyMock).not.toHaveBeenCalled();
  });
});
