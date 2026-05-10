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
      updateMany: vi.fn(),
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
import { BILLING_PLAN_FEATURES } from "./billing-plans";

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
          currentPeriodStartIso: "2026-01-01T00:00:00.000Z",
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

  it("pipeline applies ACTIVE -> createMany and SUSPENDED -> updateMany expiry", async () => {
    // ACTIVE
    h.findUniqueMock.mockResolvedValueOnce({
      id: "be_active",
      status: "RECEIVED",
      payload: {
        v: 1,
        provider: "stripe",
        providerEventId: "evt_fx_active",
        type: "SUBSCRIPTION_STARTED",
        occurredAtIso: "2026-05-01T00:00:00.000Z",
        organizationId: "orgA",
        subscription: {
          externalId: "sub_1",
          status: "ACTIVE",
          planKey: "PREMIUM",
          currentPeriodStartIso: "2026-05-01T00:00:00.000Z",
          currentPeriodEndIso: "2026-06-01T00:00:00.000Z",
        },
        payment: null,
      },
    });

    const resActive = await processPersistedBillingEventLifecycle("be_active");
    expect(resActive).toEqual({ ok: true, status: "PROCESSED" });
    expect(h.prismaMock.entitlementGrant.createMany).toHaveBeenCalledTimes(1);
    expect(h.prismaMock.entitlementGrant.updateMany).not.toHaveBeenCalled();

    const expectedFeatureKeys = BILLING_PLAN_FEATURES.PREMIUM ?? [];
    expect(h.prismaMock.entitlementGrant.createMany).toHaveBeenCalledWith({
      data: expectedFeatureKeys.map((featureKey: string) => ({
        organizationId: "orgA",
        featureKey,
        source: "BILLING",
        startsAt: new Date("2026-05-01T00:00:00.000Z"),
        expiresAt: new Date("2026-06-01T00:00:00.000Z"),
      })),
    });

    vi.resetAllMocks();
    h.updateMock.mockResolvedValue({ id: "be_suspended" });

    // SUSPENDED
    h.findUniqueMock.mockResolvedValueOnce({
      id: "be_suspended",
      status: "RECEIVED",
      payload: {
        v: 1,
        provider: "stripe",
        providerEventId: "evt_fx_suspended",
        type: "SUBSCRIPTION_RENEWED",
        occurredAtIso: "2026-05-15T00:00:00.000Z",
        organizationId: "orgA",
        subscription: {
          externalId: "sub_1",
          status: "SUSPENDED",
          planKey: "PREMIUM",
          currentPeriodEndIso: "2026-06-01T00:00:00.000Z",
        },
        payment: null,
      },
    });

    const resSuspended =
      await processPersistedBillingEventLifecycle("be_suspended");
    expect(resSuspended).toEqual({ ok: true, status: "PROCESSED" });
    expect(h.prismaMock.entitlementGrant.createMany).not.toHaveBeenCalled();
    expect(h.prismaMock.entitlementGrant.updateMany).toHaveBeenCalledTimes(1);
  });

  it("pipeline applies PAST_DUE -> status patch only (no grant create/expire)", async () => {
    h.findUniqueMock.mockResolvedValueOnce({
      id: "be_past_due",
      status: "RECEIVED",
      payload: {
        v: 1,
        provider: "stripe",
        providerEventId: "evt_fx_past_due",
        type: "SUBSCRIPTION_RENEWED",
        occurredAtIso: "2026-05-10T00:00:00.000Z",
        organizationId: "orgA",
        subscription: {
          externalId: "sub_1",
          status: "PAST_DUE",
          planKey: "PREMIUM",
          currentPeriodEndIso: "2026-06-01T00:00:00.000Z",
        },
        payment: null,
      },
    });

    const res = await processPersistedBillingEventLifecycle("be_past_due");
    expect(res).toEqual({ ok: true, status: "PROCESSED" });
    expect(h.prismaMock.organization.update).toHaveBeenCalledTimes(1);
    expect(h.prismaMock.entitlementGrant.createMany).not.toHaveBeenCalled();
    expect(h.prismaMock.entitlementGrant.updateMany).not.toHaveBeenCalled();
  });

  it("pipeline applies CANCELLED -> updateMany expiry", async () => {
    h.findUniqueMock.mockResolvedValueOnce({
      id: "be_cancelled",
      status: "RECEIVED",
      payload: {
        v: 1,
        provider: "stripe",
        providerEventId: "evt_fx_cancelled",
        type: "SUBSCRIPTION_CANCELLED",
        occurredAtIso: "2026-05-20T00:00:00.000Z",
        organizationId: "orgA",
        subscription: {
          externalId: "sub_1",
          status: "CANCELLED",
          planKey: "PREMIUM",
          currentPeriodEndIso: "2026-06-01T00:00:00.000Z",
        },
        payment: null,
      },
    });

    const res = await processPersistedBillingEventLifecycle("be_cancelled");
    expect(res).toEqual({ ok: true, status: "PROCESSED" });
    expect(h.prismaMock.entitlementGrant.createMany).not.toHaveBeenCalled();
    expect(h.prismaMock.entitlementGrant.updateMany).toHaveBeenCalledTimes(1);
  });

  it("pipeline applies TRIAL -> createMany", async () => {
    h.findUniqueMock.mockResolvedValueOnce({
      id: "be_trial",
      status: "RECEIVED",
      payload: {
        v: 1,
        provider: "stripe",
        providerEventId: "evt_fx_trial",
        type: "SUBSCRIPTION_STARTED",
        occurredAtIso: "2026-05-01T00:00:00.000Z",
        organizationId: "orgA",
        subscription: {
          externalId: "sub_1",
          status: "TRIAL",
          planKey: "PREMIUM",
          currentPeriodStartIso: "2026-05-01T00:00:00.000Z",
          currentPeriodEndIso: "2026-06-01T00:00:00.000Z",
        },
        payment: null,
      },
    });

    const res = await processPersistedBillingEventLifecycle("be_trial");
    expect(res).toEqual({ ok: true, status: "PROCESSED" });
    expect(h.prismaMock.entitlementGrant.createMany).toHaveBeenCalledTimes(1);
    expect(h.prismaMock.entitlementGrant.updateMany).not.toHaveBeenCalled();

    const expectedFeatureKeys = BILLING_PLAN_FEATURES.PREMIUM ?? [];
    expect(h.prismaMock.entitlementGrant.createMany).toHaveBeenCalledWith({
      data: expectedFeatureKeys.map((featureKey: string) => ({
        organizationId: "orgA",
        featureKey,
        source: "BILLING",
        startsAt: new Date("2026-05-01T00:00:00.000Z"),
        expiresAt: new Date("2026-06-01T00:00:00.000Z"),
      })),
    });
  });

  it("pipeline applies EXPIRED -> updateMany expiry", async () => {
    h.findUniqueMock.mockResolvedValueOnce({
      id: "be_expired",
      status: "RECEIVED",
      payload: {
        v: 1,
        provider: "stripe",
        providerEventId: "evt_fx_expired",
        type: "SUBSCRIPTION_EXPIRED",
        occurredAtIso: "2026-05-25T00:00:00.000Z",
        organizationId: "orgA",
        subscription: {
          externalId: "sub_1",
          status: "EXPIRED",
          planKey: "PREMIUM",
          currentPeriodEndIso: "2026-06-01T00:00:00.000Z",
        },
        payment: null,
      },
    });

    const res = await processPersistedBillingEventLifecycle("be_expired");
    expect(res).toEqual({ ok: true, status: "PROCESSED" });
    expect(h.prismaMock.entitlementGrant.createMany).not.toHaveBeenCalled();
    expect(h.prismaMock.entitlementGrant.updateMany).toHaveBeenCalledTimes(1);
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

  it.each([
    [
      "invalid status",
      {
        v: 1,
        provider: "stripe",
        providerEventId: "evt_bad_status",
        type: "SUBSCRIPTION_RENEWED",
        occurredAtIso: "2026-01-01T00:00:00.000Z",
        organizationId: "orgA",
        subscription: {
          externalId: "sub_1",
          status: "NOPE",
          planKey: "PREMIUM",
          currentPeriodStartIso: "2026-01-01T00:00:00.000Z",
          currentPeriodEndIso: "2026-02-01T00:00:00.000Z",
        },
        payment: null,
      },
    ],
    [
      "invalid planKey",
      {
        v: 1,
        provider: "stripe",
        providerEventId: "evt_bad_plan",
        type: "SUBSCRIPTION_RENEWED",
        occurredAtIso: "2026-01-01T00:00:00.000Z",
        organizationId: "orgA",
        subscription: {
          externalId: "sub_1",
          status: "ACTIVE",
          planKey: "GOLD",
          currentPeriodStartIso: "2026-01-01T00:00:00.000Z",
          currentPeriodEndIso: "2026-02-01T00:00:00.000Z",
        },
        payment: null,
      },
    ],
    [
      "invalid period date",
      {
        v: 1,
        provider: "stripe",
        providerEventId: "evt_bad_period",
        type: "SUBSCRIPTION_RENEWED",
        occurredAtIso: "2026-01-01T00:00:00.000Z",
        organizationId: "orgA",
        subscription: {
          externalId: "sub_1",
          status: "ACTIVE",
          planKey: "PREMIUM",
          currentPeriodStartIso: "not-a-date",
          currentPeriodEndIso: "2026-02-01T00:00:00.000Z",
        },
        payment: null,
      },
    ],
    [
      "missing required subscription fields",
      {
        v: 1,
        provider: "stripe",
        providerEventId: "evt_missing_sub_fields",
        type: "SUBSCRIPTION_RENEWED",
        occurredAtIso: "2026-01-01T00:00:00.000Z",
        organizationId: "orgA",
        subscription: {
          // externalId missing
          status: "ACTIVE",
          planKey: "PREMIUM",
          currentPeriodStartIso: "2026-01-01T00:00:00.000Z",
          currentPeriodEndIso: "2026-02-01T00:00:00.000Z",
        },
        payment: null,
      },
    ],
  ] as const)(
    "marks FAILED and does not mutate org/grants for %s",
    async (_label, payload) => {
      h.findUniqueMock.mockResolvedValueOnce({
        id: "be_bad",
        status: "RECEIVED",
        payload,
      });

      const res = await processPersistedBillingEventLifecycle("be_bad");
      expect(res.ok).toBe(false);
      expect(res.status).toBe("FAILED");

      expect(h.prismaMock.organization.update).not.toHaveBeenCalled();
      expect(h.prismaMock.entitlementGrant.createMany).not.toHaveBeenCalled();
      expect(h.prismaMock.entitlementGrant.updateMany).not.toHaveBeenCalled();

      expect(h.updateMock).toHaveBeenLastCalledWith({
        where: { id: "be_bad" },
        data: {
          status: "FAILED",
          processedAt: expect.any(Date),
          processingResult: {
            error: expect.objectContaining({
              code: expect.stringMatching(/MISSING_FIELDS|INVALID_FIELDS/),
            }),
            stage: "parse",
          },
        },
      });
    },
  );

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
          currentPeriodStartIso: "2026-01-01T00:00:00.000Z",
          currentPeriodEndIso: "2026-02-01T00:00:00.000Z",
        },
        payment: null,
      },
    });

    const res = await retryPersistedBillingEventLifecycle("be_6");
    expect(res).toEqual({ ok: true, status: "PROCESSED" });
  });
});
