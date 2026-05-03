import { describe, it, expect } from "vitest";
import type { BillingProvider } from "@/lib/billing/provider";
import { createEnvelopeBillingProvider } from "./envelope-provider";
import { assertBillingProviderSubscriptionPayloadContract } from "../billing-provider-contract-test-helper";
import {
  fixtureSubscriptionActive,
  fixtureSubscriptionSuspended,
  makeProviderLikeSubscriptionWebhookEnvelope,
} from "./provider-fixtures";
import {
  billingEventToPayloadV1,
  projectBillingEventPayloadV1,
} from "@/lib/billing/payload-v1";

describe("envelope billing provider adapter (skeleton)", () => {
  it("matches the BillingProvider boundary shape", () => {
    const stripe: BillingProvider = createEnvelopeBillingProvider("stripe");
    expect(stripe.id).toBe("stripe");
    expect(typeof stripe.createCheckout).toBe("function");
    expect(typeof stripe.parseWebhook).toBe("function");
  });

  it("normalizes a subscription webhook into a v1-compatible payload (contract)", async () => {
    const stripe = createEnvelopeBillingProvider("stripe");
    const res = await stripe.parseWebhook({
      headers: { "x-provider-event-id": "evt_sub_1" },
      body: JSON.stringify({
        providerEventId: "evt_sub_1",
        eventType: "SUBSCRIPTION_RENEWED",
        organizationId: "org_1",
        payload: {
          subscription: {
            externalId: "sub_1",
            status: "ACTIVE",
            planKey: "PREMIUM",
            currentPeriodStartIso: "2026-03-01T00:00:00.000Z",
            currentPeriodEndIso: "2026-04-01T00:00:00.000Z",
          },
        },
      }),
    });

    expect(res.events).toHaveLength(1);
    const event = res.events[0];
    expect(event.provider).toBe("stripe");
    expect(event.type).toBe("SUBSCRIPTION_RENEWED");
    expect(event.subscription).not.toBeNull();
    if (!event.subscription) return;

    assertBillingProviderSubscriptionPayloadContract(event, {
      provider: "stripe",
      organizationId: "org_1",
      subscriptionStatus: "ACTIVE",
      planKey: "PREMIUM",
      currentPeriodStartIso: "2026-03-01T00:00:00.000Z",
      currentPeriodEndIso: "2026-04-01T00:00:00.000Z",
    });
  });

  it("fixture sandbox: envelope -> BillingEventPayloadV1 -> projection (ACTIVE then SUSPENDED)", async () => {
    const provider = createEnvelopeBillingProvider("stripe");

    const activeFx = fixtureSubscriptionActive({ provider: "stripe" });
    const activeReq = makeProviderLikeSubscriptionWebhookEnvelope(activeFx);
    const activeRes = await provider.parseWebhook(activeReq);
    expect(activeRes.events).toHaveLength(1);
    const activeEvent = activeRes.events[0]!;
    const activePayload = billingEventToPayloadV1(activeEvent);
    const activeProjection = projectBillingEventPayloadV1(activePayload);
    expect(activeProjection.subscriptionPatch?.status).toBe("ACTIVE");
    expect(
      activeProjection.entitlementsDelta?.enableFeatureKeys.length,
    ).toBeGreaterThan(0);
    expect(activeProjection.entitlementsDelta?.disableFeatureKeys).toEqual([]);

    const suspendedFx = fixtureSubscriptionSuspended({ provider: "stripe" });
    const suspendedReq =
      makeProviderLikeSubscriptionWebhookEnvelope(suspendedFx);
    const suspendedRes = await provider.parseWebhook(suspendedReq);
    expect(suspendedRes.events).toHaveLength(1);
    const suspendedEvent = suspendedRes.events[0]!;
    const suspendedPayload = billingEventToPayloadV1(suspendedEvent);
    const suspendedProjection = projectBillingEventPayloadV1(suspendedPayload);
    expect(suspendedProjection.subscriptionPatch?.status).toBe("SUSPENDED");
    expect(suspendedProjection.entitlementsDelta?.enableFeatureKeys).toEqual(
      [],
    );
    expect(
      suspendedProjection.entitlementsDelta?.disableFeatureKeys.length,
    ).toBeGreaterThan(0);
  });
});
