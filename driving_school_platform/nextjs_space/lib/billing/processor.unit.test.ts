import { describe, it, expect } from "vitest";
import { processPersistedBillingEventPayload } from "./processor";

describe("billing processor (payload v1 end-to-end)", () => {
  it("consumes persisted BillingEventPayloadV1 and produces a projection", () => {
    const res = processPersistedBillingEventPayload({
      v: 1,
      provider: "sibs",
      providerEventId: "evt_1",
      type: "SUBSCRIPTION_STARTED",
      occurredAtIso: "2026-01-01T00:00:00.000Z",
      organizationId: "org_1",
      subscription: {
        externalId: "sub_1",
        status: "ACTIVE",
        planKey: "PREMIUM",
        currentPeriodEndIso: "2026-02-01T00:00:00.000Z",
      },
      payment: null,
      raw: { any: "thing" },
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.projection.subscriptionPatch).toEqual({
      status: "ACTIVE",
      planKey: "PREMIUM",
      currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
    });
  });

  it("fails in a controlled way for invalid payload", () => {
    const res = processPersistedBillingEventPayload(123);
    expect(res).toEqual({
      ok: false,
      error: { code: "NOT_OBJECT", message: "Payload must be an object" },
    });
  });
});
