import { describe, it, expect, vi, beforeEach } from "vitest";
import { sibsBillingProvider } from "@/lib/billing/providers";

const h = vi.hoisted(() => {
  const recordBillingEventWithOutcomeMock = vi.fn();
  const processPersistedBillingEventLifecycleMock = vi.fn();
  return {
    recordBillingEventWithOutcomeMock,
    processPersistedBillingEventLifecycleMock,
  };
});

vi.mock("@/lib/billing", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/billing")>();
  return {
    ...original,
    recordBillingEventWithOutcome: h.recordBillingEventWithOutcomeMock,
    processPersistedBillingEventLifecycle:
      h.processPersistedBillingEventLifecycleMock,
  };
});

// IMPORT AFTER MOCKS
import { POST } from "./[provider]/route";

function jsonReq(payload: unknown, headers?: Record<string, string>): Request {
  return new Request("http://localhost/api/billing/webhooks/sibs", {
    method: "POST",
    headers: { "content-type": "application/json", ...(headers ?? {}) },
    body: JSON.stringify(payload),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("Billing Webhooks boundary (skeleton)", () => {
  it("uses the adapter from the provider registry (sibs)", async () => {
    const spy = vi.spyOn(sibsBillingProvider, "parseWebhook");
    h.recordBillingEventWithOutcomeMock.mockResolvedValue({
      event: { id: "be_1" },
      created: true,
    });
    h.processPersistedBillingEventLifecycleMock.mockResolvedValue({
      ok: true,
      status: "PROCESSED",
    });

    const res = await POST(
      jsonReq({
        providerEventId: "evt_1",
        eventType: "PAYMENT_SUCCEEDED",
        payload: { any: "thing" },
      }) as any,
      { params: { provider: "sibs" } } as any,
    );

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("returns 400 for invalid provider", async () => {
    const res = await POST(
      jsonReq({ providerEventId: "evt_1" }) as any,
      {
        params: { provider: "nope" },
      } as any,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Unsupported provider");
    expect(h.recordBillingEventWithOutcomeMock).not.toHaveBeenCalled();
  });

  it("records BillingEvent for a valid provider", async () => {
    h.recordBillingEventWithOutcomeMock.mockResolvedValue({
      event: { id: "be_1" },
      created: true,
    });
    h.processPersistedBillingEventLifecycleMock.mockResolvedValue({
      ok: true,
      status: "PROCESSED",
    });

    const res = await POST(
      jsonReq({
        providerEventId: "evt_1",
        eventType: "PAYMENT_SUCCEEDED",
        payload: { any: "thing" },
      }) as any,
      { params: { provider: "sibs" } } as any,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, billingEventId: "be_1" });

    expect(h.recordBillingEventWithOutcomeMock).toHaveBeenCalledWith({
      provider: "sibs",
      providerEventId: "evt_1",
      eventType: "PAYMENT_SUCCEEDED",
      organizationId: null,
      payload: expect.objectContaining({
        v: 1,
        provider: "sibs",
        providerEventId: "evt_1",
        type: "PAYMENT_SUCCEEDED",
      }),
    });
  });

  it("is stable on duplicate providerEventId (idempotency via event store)", async () => {
    h.recordBillingEventWithOutcomeMock
      .mockResolvedValueOnce({ event: { id: "be_existing" }, created: true })
      .mockResolvedValueOnce({ event: { id: "be_existing" }, created: false });
    h.processPersistedBillingEventLifecycleMock.mockResolvedValue({
      ok: true,
      status: "PROCESSED",
    });

    const req = jsonReq({
      providerEventId: "evt_dup",
      eventType: "PAYMENT_SUCCEEDED",
      payload: { ok: true },
    });

    const res1 = await POST(
      req as any,
      { params: { provider: "stripe" } } as any,
    );
    expect(res1.status).toBe(200);

    const res2 = await POST(
      jsonReq({
        providerEventId: "evt_dup",
        eventType: "PAYMENT_SUCCEEDED",
        payload: { ok: true },
      }) as any,
      { params: { provider: "stripe" } } as any,
    );
    expect(res2.status).toBe(200);

    expect(h.recordBillingEventWithOutcomeMock).toHaveBeenCalledTimes(2);
    // Only process newly created events (do not double-apply on duplicates)
    expect(h.processPersistedBillingEventLifecycleMock).toHaveBeenCalledTimes(
      1,
    );
  });
});
