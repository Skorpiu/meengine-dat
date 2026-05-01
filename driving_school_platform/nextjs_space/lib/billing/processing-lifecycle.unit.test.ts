import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const findUniqueMock = vi.fn();
  const updateMock = vi.fn();

  const prismaMock = {
    billingEvent: {
      findUnique: findUniqueMock,
      update: updateMock,
    },
    organization: {
      update: vi.fn(),
    },
    entitlementGrant: {
      createMany: vi.fn(),
    },
  };

  return { prismaMock, findUniqueMock, updateMock };
});

vi.mock("@/lib/db", () => ({
  db: h.prismaMock,
}));

import {
  processPersistedBillingEventLifecycle,
  retryPersistedBillingEventLifecycle,
} from "./processing-lifecycle";

describe("billing processing lifecycle (persisted event -> apply -> status)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    h.updateMock.mockResolvedValue({ id: "be_1" });
  });

  it("marks PROCESSED on successful parse+apply", async () => {
    h.findUniqueMock.mockResolvedValue({
      id: "be_1",
      status: "RECEIVED",
      payload: {
        v: 1,
        provider: "sibs",
        providerEventId: "evt_1",
        type: "SUBSCRIPTION_STARTED",
        occurredAtIso: "2026-01-01T00:00:00.000Z",
        organizationId: "orgA",
        subscription: {
          externalId: "sub_1",
          status: "ACTIVE",
          planKey: "PREMIUM",
          currentPeriodEndIso: "2026-02-01T00:00:00.000Z",
        },
        payment: null,
      },
    });

    const res = await processPersistedBillingEventLifecycle("be_1");
    expect(res).toEqual({ ok: true, status: "PROCESSED" });

    // last update should be PROCESSED
    expect(h.updateMock).toHaveBeenLastCalledWith({
      where: { id: "be_1" },
      data: {
        status: "PROCESSED",
        processedAt: expect.any(Date),
        processingResult: { ok: true },
      },
    });
  });

  it("marks FAILED on parse error", async () => {
    h.findUniqueMock.mockResolvedValue({
      id: "be_2",
      status: "RECEIVED",
      payload: 123,
    });

    const res = await processPersistedBillingEventLifecycle("be_2");
    expect(res.ok).toBe(false);
    expect(res.status).toBe("FAILED");

    expect(h.updateMock).toHaveBeenLastCalledWith({
      where: { id: "be_2" },
      data: {
        status: "FAILED",
        processedAt: expect.any(Date),
        processingResult: {
          error: { code: "NOT_OBJECT", message: "Payload must be an object" },
          stage: "parse",
        },
      },
    });
  });

  it("retries FAILED event and marks PROCESSED on success", async () => {
    h.findUniqueMock.mockResolvedValue({
      id: "be_3",
      status: "FAILED",
      payload: {
        v: 1,
        provider: "sibs",
        providerEventId: "evt_3",
        type: "SUBSCRIPTION_STARTED",
        occurredAtIso: "2026-01-01T00:00:00.000Z",
        organizationId: "orgA",
        subscription: {
          externalId: "sub_1",
          status: "ACTIVE",
          planKey: "PREMIUM",
          currentPeriodStartIso: "2026-01-01T00:00:00.000Z",
          currentPeriodEndIso: "2026-02-01T00:00:00.000Z",
        },
        payment: null,
      },
    });

    const res = await retryPersistedBillingEventLifecycle("be_3");
    expect(res).toEqual({ ok: true, status: "PROCESSED" });
    expect(h.updateMock).toHaveBeenLastCalledWith({
      where: { id: "be_3" },
      data: {
        status: "PROCESSED",
        processedAt: expect.any(Date),
        processingResult: { ok: true },
      },
    });
  });

  it("retries FAILED event and remains FAILED if processing still fails", async () => {
    h.findUniqueMock.mockResolvedValue({
      id: "be_4",
      status: "FAILED",
      payload: 123,
    });

    const res = await retryPersistedBillingEventLifecycle("be_4");
    expect(res.ok).toBe(false);
    expect(res.status).toBe("FAILED");
    expect(h.updateMock).toHaveBeenLastCalledWith({
      where: { id: "be_4" },
      data: {
        status: "FAILED",
        processedAt: expect.any(Date),
        processingResult: {
          error: { code: "NOT_OBJECT", message: "Payload must be an object" },
          stage: "parse",
        },
      },
    });
  });

  it("does not reprocess PROCESSED events", async () => {
    h.findUniqueMock.mockResolvedValue({
      id: "be_5",
      status: "PROCESSED",
      payload: { v: 1 },
    });

    const res = await retryPersistedBillingEventLifecycle("be_5");
    expect(res).toEqual({ ok: true, status: "SKIPPED" });
    expect(h.updateMock).not.toHaveBeenCalled();
  });

  it("retry supports RECEIVED events explicitly", async () => {
    h.findUniqueMock.mockResolvedValue({
      id: "be_6",
      status: "RECEIVED",
      payload: {
        v: 1,
        provider: "sibs",
        providerEventId: "evt_6",
        type: "SUBSCRIPTION_STARTED",
        occurredAtIso: "2026-01-01T00:00:00.000Z",
        organizationId: "orgA",
        subscription: {
          externalId: "sub_1",
          status: "ACTIVE",
          planKey: "PREMIUM",
          currentPeriodEndIso: "2026-02-01T00:00:00.000Z",
        },
        payment: null,
      },
    });

    const res = await retryPersistedBillingEventLifecycle("be_6");
    expect(res).toEqual({ ok: true, status: "PROCESSED" });
  });
});
