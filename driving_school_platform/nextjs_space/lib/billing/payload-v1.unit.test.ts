import { describe, it, expect } from "vitest";
import {
  parseBillingEventPayloadV1,
  projectBillingEventPayloadV1,
} from "./payload-v1";

describe("billing payload v1 codec (foundation)", () => {
  it("normalizes a valid legacy BillingEvent payload into BillingEventPayloadV1", () => {
    const res = parseBillingEventPayloadV1({
      provider: "sibs",
      providerEventId: "evt_1",
      type: "SUBSCRIPTION_STARTED",
      occurredAt: new Date("2026-01-01T00:00:00.000Z"),
      organizationId: "org_1",
      subscription: {
        externalId: "sub_1",
        status: "ACTIVE",
        planKey: "PREMIUM",
        currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
      },
      payment: null,
      raw: { any: "thing" },
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value).toMatchObject({
      v: 1,
      provider: "sibs",
      providerEventId: "evt_1",
      type: "SUBSCRIPTION_STARTED",
      organizationId: "org_1",
      subscription: {
        externalId: "sub_1",
        status: "ACTIVE",
        planKey: "PREMIUM",
        currentPeriodEndIso: "2026-02-01T00:00:00.000Z",
      },
    });
    expect(res.value.occurredAtIso).toBe("2026-01-01T00:00:00.000Z");
  });

  it("fails in a controlled way for invalid payload", () => {
    const res = parseBillingEventPayloadV1(123);
    expect(res).toEqual({
      ok: false,
      error: { code: "NOT_OBJECT", message: "Payload must be an object" },
    });
  });

  it("projector supports the subscription case using the normalized payload", () => {
    const parsed = parseBillingEventPayloadV1({
      v: 1,
      provider: "stripe",
      providerEventId: "evt_sub_1",
      type: "SUBSCRIPTION_RENEWED",
      occurredAtIso: "2026-03-01T00:00:00.000Z",
      organizationId: "org_1",
      subscription: {
        externalId: "sub_1",
        status: "ACTIVE",
        planKey: "PREMIUM",
        currentPeriodEndIso: "2026-04-01T00:00:00.000Z",
      },
      payment: null,
      raw: { provider: "anything" },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const projection = projectBillingEventPayloadV1(parsed.value);
    expect(projection.subscriptionPatch).toEqual({
      status: "ACTIVE",
      planKey: "PREMIUM",
      currentPeriodEnd: new Date("2026-04-01T00:00:00.000Z"),
    });
    expect(
      projection.entitlementsDelta?.enableFeatureKeys.length,
    ).toBeGreaterThan(0);
  });
});
