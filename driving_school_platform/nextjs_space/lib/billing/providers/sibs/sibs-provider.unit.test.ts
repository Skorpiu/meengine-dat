import { describe, it, expect } from "vitest";
import type { BillingProvider } from "@/lib/billing/provider";
import { sibsBillingProvider } from "./sibs-provider";
import { assertBillingProviderSubscriptionPayloadContract } from "../billing-provider-contract-test-helper";

describe("SIBS billing provider adapter (skeleton)", () => {
  it("matches the BillingProvider boundary shape", () => {
    const p: BillingProvider = sibsBillingProvider;
    expect(p.id).toBe("sibs");
    expect(typeof p.createCheckout).toBe("function");
    expect(typeof p.parseWebhook).toBe("function");
  });

  it("parseWebhook returns a coherent BillingWebhookParseResult (controlled stub)", async () => {
    const res = await sibsBillingProvider.parseWebhook({
      headers: { "x-provider-event-id": "evt_123" },
      body: JSON.stringify({
        providerEventId: "evt_123",
        eventType: "PAYMENT_SUCCEEDED",
        organizationId: "org_1",
        payload: { ok: true },
      }),
    });

    expect(res.events).toHaveLength(1);
    expect(res.events[0]).toEqual({
      provider: "sibs",
      providerEventId: "evt_123",
      type: "PAYMENT_SUCCEEDED",
      occurredAt: new Date(0),
      organizationId: "org_1",
      subscription: null,
      payment: null,
      raw: expect.anything(),
    });
  });

  it("normalizes a subscription webhook into a v1-compatible payload (contract)", async () => {
    const res = await sibsBillingProvider.parseWebhook({
      headers: { "x-provider-event-id": "evt_sub_1" },
      body: JSON.stringify({
        providerEventId: "evt_sub_1",
        eventType: "SUBSCRIPTION_STARTED",
        organizationId: "org_1",
        payload: {
          subscription: {
            externalId: "sub_1",
            status: "ACTIVE",
            planKey: "PREMIUM",
            currentPeriodStartIso: "2026-01-01T00:00:00.000Z",
            currentPeriodEndIso: "2026-02-01T00:00:00.000Z",
          },
        },
      }),
    });

    expect(res.events).toHaveLength(1);
    const event = res.events[0];
    expect(event.subscription).not.toBeNull();
    if (!event.subscription) return;

    assertBillingProviderSubscriptionPayloadContract(event, {
      provider: "sibs",
      organizationId: "org_1",
      subscriptionStatus: "ACTIVE",
      planKey: "PREMIUM",
      currentPeriodStartIso: "2026-01-01T00:00:00.000Z",
      currentPeriodEndIso: "2026-02-01T00:00:00.000Z",
    });
  });

  it.each([
    [
      "present invalid currentPeriodStartIso",
      {
        providerEventId: "evt_sub_bad_start",
        eventType: "SUBSCRIPTION_STARTED",
        organizationId: "org_1",
        payload: {
          subscription: {
            externalId: "sub_1",
            status: "ACTIVE",
            planKey: "PREMIUM",
            currentPeriodStartIso: "not-a-date",
            currentPeriodEndIso: "2026-02-01T00:00:00.000Z",
          },
        },
      },
    ],
    [
      "present invalid currentPeriodEndIso",
      {
        providerEventId: "evt_sub_bad_end",
        eventType: "SUBSCRIPTION_STARTED",
        organizationId: "org_1",
        payload: {
          subscription: {
            externalId: "sub_1",
            status: "ACTIVE",
            planKey: "PREMIUM",
            currentPeriodStartIso: "2026-01-01T00:00:00.000Z",
            currentPeriodEndIso: "also-not-a-date",
          },
        },
      },
    ],
    [
      "invalid status",
      {
        providerEventId: "evt_sub_bad_status",
        eventType: "SUBSCRIPTION_STARTED",
        organizationId: "org_1",
        payload: {
          subscription: {
            externalId: "sub_1",
            status: "NOPE",
            planKey: "PREMIUM",
            currentPeriodStartIso: "2026-01-01T00:00:00.000Z",
            currentPeriodEndIso: "2026-02-01T00:00:00.000Z",
          },
        },
      },
    ],
    [
      "invalid planKey",
      {
        providerEventId: "evt_sub_bad_plan",
        eventType: "SUBSCRIPTION_STARTED",
        organizationId: "org_1",
        payload: {
          subscription: {
            externalId: "sub_1",
            status: "ACTIVE",
            planKey: "GOLD",
            currentPeriodStartIso: "2026-01-01T00:00:00.000Z",
            currentPeriodEndIso: "2026-02-01T00:00:00.000Z",
          },
        },
      },
    ],
  ] as const)(
    "fails deterministically when %s is provided",
    async (_label, body) => {
      await expect(
        sibsBillingProvider.parseWebhook({
          headers: { "x-provider-event-id": body.providerEventId },
          body: JSON.stringify(body),
        }),
      ).rejects.toThrow(/Invalid subscription field/);
    },
  );

  it("createCheckout returns a coherent BillingCheckoutResponse (controlled stub)", async () => {
    const res = await sibsBillingProvider.createCheckout({
      organizationId: "org_1",
      planKey: "BASE",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      customerEmail: "a@b.com",
      metadata: { hello: "world" },
    });

    expect(res.provider).toBe("sibs");
    expect(typeof res.redirectUrl).toBe("string");
    expect(res.redirectUrl).toContain("https://checkout.sibs.invalid/session/");
    expect(res.checkoutExternalId).toBe("sibs_co_stub_org_1_BASE");
  });
});
