import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const orgUpdateMock = vi.fn();
  const grantCreateManyMock = vi.fn();

  const prismaMock = {
    organization: {
      update: orgUpdateMock,
    },
    entitlementGrant: {
      createMany: grantCreateManyMock,
    },
  };

  return { prismaMock, orgUpdateMock, grantCreateManyMock };
});

vi.mock("@/lib/db", () => ({
  db: h.prismaMock,
}));

// import after mocks
import { applyBillingProjectionForOrganization } from "./processor";

describe("billing processor apply (subscription -> org patch + entitlement grants)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    h.orgUpdateMock.mockResolvedValue({});
    h.grantCreateManyMock.mockResolvedValue({ count: 0 });
  });

  it("updates subscription fields and creates BILLING EntitlementGrant rows for plan features", async () => {
    const occurredAt = new Date("2026-05-01T00:00:00.000Z");
    const periodEnd = new Date("2026-06-01T00:00:00.000Z");

    await applyBillingProjectionForOrganization({
      organizationId: "orgA",
      occurredAt,
      projection: {
        subscriptionPatch: {
          status: "ACTIVE",
          planKey: "PREMIUM",
          currentPeriodEnd: periodEnd,
        },
        entitlementsDelta: {
          enableFeatureKeys: ["VEHICLE_MANAGEMENT", "LESSON_MANAGEMENT"],
          disableFeatureKeys: [],
        },
      },
    });

    expect(h.orgUpdateMock).toHaveBeenCalledWith({
      where: { id: "orgA" },
      data: {
        subscriptionTier: "PREMIUM",
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: periodEnd,
      },
    });

    expect(h.grantCreateManyMock).toHaveBeenCalledWith({
      data: [
        {
          organizationId: "orgA",
          featureKey: "VEHICLE_MANAGEMENT",
          source: "BILLING",
          startsAt: occurredAt,
          expiresAt: periodEnd,
        },
        {
          organizationId: "orgA",
          featureKey: "LESSON_MANAGEMENT",
          source: "BILLING",
          startsAt: occurredAt,
          expiresAt: periodEnd,
        },
      ],
    });
  });

  it("does not create grants when subscription is not active", async () => {
    const occurredAt = new Date("2026-05-01T00:00:00.000Z");

    await applyBillingProjectionForOrganization({
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

    expect(h.orgUpdateMock).toHaveBeenCalledTimes(1);
    expect(h.grantCreateManyMock).not.toHaveBeenCalled();
  });
});
