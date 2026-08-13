import { afterEach, describe, expect, it, vi } from "vitest";
import { getBillingProvider } from "@/lib/billing/providers";
import { POST } from "./[provider]/route";

function rawReq(body: string): Request {
  return new Request("http://localhost/api/billing/webhooks/sibs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Billing Webhooks authenticity containment", () => {
  it.each(["sibs", "stripe", "paypal"] as const)(
    "fails closed for supported provider %s before provider parsing",
    async (providerId) => {
      const provider = getBillingProvider(providerId);
      const parseSpy = vi.spyOn(provider, "parseWebhook");

      const res = await POST(
        rawReq(
          JSON.stringify({
            providerEventId: "evt_untrusted_1",
            eventType: "SUBSCRIPTION_RENEWED",
            organizationId: "org_1",
            payload: {
              subscription: {
                externalId: "sub_1",
                status: "ACTIVE",
                planKey: "PREMIUM",
              },
            },
          }),
        ),
        { params: { provider: providerId } },
      );

      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({
        error: "Billing webhook could not be processed.",
        code: "billing_webhook_authenticity_unavailable",
      });

      expect(parseSpy).not.toHaveBeenCalled();
    },
  );

  it("fails closed before provider parsing for malformed body", async () => {
    const provider = getBillingProvider("sibs");
    const parseSpy = vi.spyOn(provider, "parseWebhook");

    const res = await POST(rawReq("{ definitely-not-valid-json"), {
      params: { provider: "sibs" },
    });

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      error: "Billing webhook could not be processed.",
      code: "billing_webhook_authenticity_unavailable",
    });

    expect(parseSpy).not.toHaveBeenCalled();
  });

  it("preserves deterministic rejection for unsupported providers", async () => {
    const provider = getBillingProvider("sibs");
    const parseSpy = vi.spyOn(provider, "parseWebhook");

    const res = await POST(rawReq('{"providerEventId":"evt_1"}'), {
      params: { provider: "nope" },
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Unsupported provider",
      code: "billing_webhook_unsupported_provider",
    });

    expect(parseSpy).not.toHaveBeenCalled();
  });
});
