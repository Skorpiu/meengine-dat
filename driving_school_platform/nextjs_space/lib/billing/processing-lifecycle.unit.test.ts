import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const txQueryRaw = vi.fn();
  const txFindUnique = vi.fn();
  const txUpdate = vi.fn();
  const txUpdateMany = vi.fn();
  const txOrgUpdate = vi.fn();
  const txGrantCreateMany = vi.fn();
  const txGrantUpdateMany = vi.fn();

  const dbUpdateMany = vi.fn();
  const dbFindUnique = vi.fn();
  const dbOrgUpdate = vi.fn();
  const dbGrantCreateMany = vi.fn();
  const dbGrantUpdateMany = vi.fn();
  const dbUpdate = vi.fn();

  const tx = {
    $queryRaw: txQueryRaw,
    billingEvent: {
      findUnique: txFindUnique,
      update: txUpdate,
      updateMany: txUpdateMany,
    },
    organization: {
      update: txOrgUpdate,
    },
    entitlementGrant: {
      createMany: txGrantCreateMany,
      updateMany: txGrantUpdateMany,
    },
  };

  const prismaMock = {
    $transaction: vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
    billingEvent: {
      findUnique: dbFindUnique,
      update: dbUpdate,
      updateMany: dbUpdateMany,
    },
    organization: {
      update: dbOrgUpdate,
    },
    entitlementGrant: {
      createMany: dbGrantCreateMany,
      updateMany: dbGrantUpdateMany,
    },
  };

  return {
    tx,
    prismaMock,
    txQueryRaw,
    txFindUnique,
    txUpdate,
    txOrgUpdate,
    txGrantCreateMany,
    txGrantUpdateMany,
    dbUpdateMany,
    dbFindUnique,
    dbOrgUpdate,
    dbGrantCreateMany,
    dbGrantUpdateMany,
    dbUpdate,
  };
});

vi.mock("@/lib/db", () => ({
  db: h.prismaMock,
}));

import {
  processPersistedBillingEventLifecycle,
  retryPersistedBillingEventLifecycle,
} from "./processing-lifecycle";
import { BILLING_PLAN_FEATURES } from "./billing-plans";

function premiumStartedPayload(providerEventId: string) {
  return {
    v: 1,
    provider: "sibs",
    providerEventId,
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
  };
}

describe("billing processing lifecycle (locked tx apply)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.txQueryRaw.mockResolvedValue([{ id: "be_1" }]);
    h.txUpdate.mockResolvedValue({ id: "be_1" });
    h.txOrgUpdate.mockResolvedValue({});
    h.txGrantCreateMany.mockResolvedValue({ count: 0 });
    h.txGrantUpdateMany.mockResolvedValue({ count: 0 });
    h.dbUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("marks PROCESSED on successful parse+apply through the transaction client", async () => {
    h.txFindUnique.mockResolvedValue({
      id: "be_1",
      status: "RECEIVED",
      organizationId: "orgA",
      payload: premiumStartedPayload("evt_1"),
    });

    const res = await processPersistedBillingEventLifecycle("be_1");
    expect(res).toEqual({ ok: true, status: "PROCESSED" });

    expect(h.txQueryRaw).toHaveBeenCalledTimes(1);
    expect(h.txUpdate).toHaveBeenLastCalledWith({
      where: { id: "be_1" },
      data: {
        status: "PROCESSED",
        processedAt: expect.any(Date),
        processingResult: { ok: true },
      },
    });
    expect(h.dbOrgUpdate).not.toHaveBeenCalled();
    expect(h.dbGrantCreateMany).not.toHaveBeenCalled();
    expect(h.dbUpdate).not.toHaveBeenCalled();
    expect(h.txOrgUpdate).toHaveBeenCalledTimes(1);
    expect(h.txGrantCreateMany).toHaveBeenCalledTimes(1);
  });

  it("never falls through to global db delegates on the apply path", async () => {
    h.txFindUnique.mockResolvedValue({
      id: "be_1",
      status: "RECEIVED",
      organizationId: "orgA",
      payload: premiumStartedPayload("evt_tx_only"),
    });

    await processPersistedBillingEventLifecycle("be_1");

    expect(h.prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(h.dbOrgUpdate).not.toHaveBeenCalled();
    expect(h.dbGrantCreateMany).not.toHaveBeenCalled();
    expect(h.dbGrantUpdateMany).not.toHaveBeenCalled();
    expect(h.dbUpdate).not.toHaveBeenCalled();
    expect(h.dbFindUnique).not.toHaveBeenCalled();
    expect(h.dbUpdateMany).not.toHaveBeenCalled();
  });

  it("pipeline applies ACTIVE -> createMany and SUSPENDED -> updateMany expiry", async () => {
    h.txFindUnique.mockResolvedValueOnce({
      id: "be_active",
      status: "RECEIVED",
      organizationId: "orgA",
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
    expect(h.txGrantCreateMany).toHaveBeenCalledTimes(1);
    expect(h.txGrantUpdateMany).not.toHaveBeenCalled();

    const expectedFeatureKeys = BILLING_PLAN_FEATURES.PREMIUM ?? [];
    expect(h.txGrantCreateMany).toHaveBeenCalledWith({
      data: expectedFeatureKeys.map((featureKey: string) => ({
        organizationId: "orgA",
        featureKey,
        source: "BILLING",
        startsAt: new Date("2026-05-01T00:00:00.000Z"),
        expiresAt: new Date("2026-06-01T00:00:00.000Z"),
      })),
    });

    vi.clearAllMocks();
    h.txQueryRaw.mockResolvedValue([{ id: "be_suspended" }]);
    h.txUpdate.mockResolvedValue({ id: "be_suspended" });
    h.txOrgUpdate.mockResolvedValue({});
    h.txGrantUpdateMany.mockResolvedValue({ count: 1 });

    h.txFindUnique.mockResolvedValueOnce({
      id: "be_suspended",
      status: "RECEIVED",
      organizationId: "orgA",
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
    expect(h.txGrantCreateMany).not.toHaveBeenCalled();
    expect(h.txGrantUpdateMany).toHaveBeenCalledTimes(1);
  });

  it("ACTIVE without currentPeriodStartIso falls back to occurredAt for entitlement startsAt", async () => {
    h.txFindUnique.mockResolvedValueOnce({
      id: "be_active_no_start",
      status: "RECEIVED",
      organizationId: "orgA",
      payload: {
        v: 1,
        provider: "stripe",
        providerEventId: "evt_fx_active_no_start",
        type: "SUBSCRIPTION_STARTED",
        occurredAtIso: "2026-05-02T00:00:00.000Z",
        organizationId: "orgA",
        subscription: {
          externalId: "sub_1",
          status: "ACTIVE",
          planKey: "PREMIUM",
          currentPeriodEndIso: "2026-06-01T00:00:00.000Z",
        },
        payment: null,
      },
    });

    const res =
      await processPersistedBillingEventLifecycle("be_active_no_start");
    expect(res).toEqual({ ok: true, status: "PROCESSED" });

    const expectedFeatureKeys = BILLING_PLAN_FEATURES.PREMIUM ?? [];
    expect(h.txGrantCreateMany).toHaveBeenCalledWith({
      data: expectedFeatureKeys.map((featureKey: string) => ({
        organizationId: "orgA",
        featureKey,
        source: "BILLING",
        startsAt: new Date("2026-05-02T00:00:00.000Z"),
        expiresAt: new Date("2026-06-01T00:00:00.000Z"),
      })),
    });
  });

  it("pipeline applies PAST_DUE -> status patch only (no grant create/expire)", async () => {
    h.txFindUnique.mockResolvedValueOnce({
      id: "be_past_due",
      status: "RECEIVED",
      organizationId: "orgA",
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
    expect(h.txOrgUpdate).toHaveBeenCalledTimes(1);
    expect(h.txGrantCreateMany).not.toHaveBeenCalled();
    expect(h.txGrantUpdateMany).not.toHaveBeenCalled();
  });

  it("pipeline applies CANCELLED -> updateMany expiry", async () => {
    h.txFindUnique.mockResolvedValueOnce({
      id: "be_cancelled",
      status: "RECEIVED",
      organizationId: "orgA",
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
    expect(h.txGrantCreateMany).not.toHaveBeenCalled();
    expect(h.txGrantUpdateMany).toHaveBeenCalledTimes(1);
  });

  it("pipeline applies TRIAL -> createMany", async () => {
    h.txFindUnique.mockResolvedValueOnce({
      id: "be_trial",
      status: "RECEIVED",
      organizationId: "orgA",
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
    expect(h.txGrantCreateMany).toHaveBeenCalledTimes(1);
    expect(h.txGrantUpdateMany).not.toHaveBeenCalled();
  });

  it("pipeline applies EXPIRED -> updateMany expiry", async () => {
    h.txFindUnique.mockResolvedValueOnce({
      id: "be_expired",
      status: "RECEIVED",
      organizationId: "orgA",
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
    expect(h.txGrantCreateMany).not.toHaveBeenCalled();
    expect(h.txGrantUpdateMany).toHaveBeenCalledTimes(1);
  });

  it("marks FAILED on parse error with JSON-safe processingResult and zero projection", async () => {
    h.txFindUnique.mockResolvedValue({
      id: "be_2",
      status: "RECEIVED",
      organizationId: "orgA",
      payload: 123,
    });

    const res = await processPersistedBillingEventLifecycle("be_2");
    expect(res.ok).toBe(false);
    expect(res.status).toBe("FAILED");

    expect(h.txOrgUpdate).not.toHaveBeenCalled();
    expect(h.txGrantCreateMany).not.toHaveBeenCalled();
    expect(h.txUpdate).toHaveBeenLastCalledWith({
      where: { id: "be_2" },
      data: {
        status: "FAILED",
        processedAt: expect.any(Date),
        processingResult: {
          stage: "parse",
          code: "NOT_OBJECT",
          message: "Payload must be an object",
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
      h.txFindUnique.mockResolvedValueOnce({
        id: "be_bad",
        status: "RECEIVED",
        organizationId: "orgA",
        payload,
      });

      const res = await processPersistedBillingEventLifecycle("be_bad");
      expect(res.ok).toBe(false);
      expect(res.status).toBe("FAILED");

      expect(h.txOrgUpdate).not.toHaveBeenCalled();
      expect(h.txGrantCreateMany).not.toHaveBeenCalled();
      expect(h.txGrantUpdateMany).not.toHaveBeenCalled();
      expect(h.txUpdate).toHaveBeenLastCalledWith({
        where: { id: "be_bad" },
        data: {
          status: "FAILED",
          processedAt: expect.any(Date),
          processingResult: {
            stage: "parse",
            code: expect.stringMatching(/MISSING_FIELDS|INVALID_FIELDS/),
            message: expect.any(String),
          },
        },
      });
    },
  );

  it("fails before projection when persisted organization disagrees with payload organization", async () => {
    h.txFindUnique.mockResolvedValue({
      id: "be_mismatch",
      status: "RECEIVED",
      organizationId: "orgA",
      payload: {
        ...premiumStartedPayload("evt_mismatch"),
        organizationId: "orgB",
      },
    });

    const res = await processPersistedBillingEventLifecycle("be_mismatch");
    expect(res).toEqual({
      ok: false,
      status: "FAILED",
      error: {
        code: "ORGANIZATION_MISMATCH",
        message:
          "Persisted BillingEvent.organizationId does not match payload organizationId",
      },
    });

    expect(h.txOrgUpdate).not.toHaveBeenCalled();
    expect(h.txGrantCreateMany).not.toHaveBeenCalled();
    expect(h.txUpdate).toHaveBeenLastCalledWith({
      where: { id: "be_mismatch" },
      data: {
        status: "FAILED",
        processedAt: expect.any(Date),
        processingResult: {
          stage: "validate",
          code: "ORGANIZATION_MISMATCH",
          message:
            "Persisted BillingEvent.organizationId does not match payload organizationId",
        },
      },
    });
  });

  it("retries FAILED event and marks PROCESSED on success", async () => {
    h.txFindUnique.mockResolvedValue({
      id: "be_3",
      status: "FAILED",
      organizationId: "orgA",
      payload: premiumStartedPayload("evt_3"),
    });

    const res = await retryPersistedBillingEventLifecycle("be_3");
    expect(res).toEqual({ ok: true, status: "PROCESSED" });
    expect(h.txOrgUpdate).toHaveBeenCalledTimes(1);
    expect(h.txGrantCreateMany).toHaveBeenCalledTimes(1);
    expect(h.txUpdate).toHaveBeenLastCalledWith({
      where: { id: "be_3" },
      data: {
        status: "PROCESSED",
        processedAt: expect.any(Date),
        processingResult: { ok: true },
      },
    });
  });

  it("retries FAILED event and remains FAILED if processing still fails", async () => {
    h.txFindUnique.mockResolvedValue({
      id: "be_4",
      status: "FAILED",
      organizationId: "orgA",
      payload: 123,
    });

    const res = await retryPersistedBillingEventLifecycle("be_4");
    expect(res.ok).toBe(false);
    expect(res.status).toBe("FAILED");
    expect(h.txOrgUpdate).not.toHaveBeenCalled();
    expect(h.txUpdate).toHaveBeenLastCalledWith({
      where: { id: "be_4" },
      data: {
        status: "FAILED",
        processedAt: expect.any(Date),
        processingResult: {
          stage: "parse",
          code: "NOT_OBJECT",
          message: "Payload must be an object",
        },
      },
    });
  });

  it("does not reprocess PROCESSED events", async () => {
    h.txFindUnique.mockResolvedValue({
      id: "be_5",
      status: "PROCESSED",
      organizationId: "orgA",
      payload: { v: 1 },
    });

    const res = await retryPersistedBillingEventLifecycle("be_5");
    expect(res).toEqual({ ok: true, status: "SKIPPED" });
    expect(h.txOrgUpdate).not.toHaveBeenCalled();
    expect(h.txGrantCreateMany).not.toHaveBeenCalled();
    expect(h.txUpdate).not.toHaveBeenCalled();
  });

  it("retry supports RECEIVED events explicitly", async () => {
    h.txFindUnique.mockResolvedValue({
      id: "be_6",
      status: "RECEIVED",
      organizationId: "orgA",
      payload: premiumStartedPayload("evt_6"),
    });

    const res = await retryPersistedBillingEventLifecycle("be_6");
    expect(res).toEqual({ ok: true, status: "PROCESSED" });
  });

  it("records JSON-safe FAILED after an apply exception without using a raw Error object", async () => {
    h.txFindUnique.mockResolvedValue({
      id: "be_apply_fail",
      status: "RECEIVED",
      organizationId: "orgA",
      payload: premiumStartedPayload("evt_apply_fail"),
    });
    h.txGrantCreateMany.mockRejectedValue(new Error("grant write failed"));

    const res = await processPersistedBillingEventLifecycle("be_apply_fail");
    expect(res.ok).toBe(false);
    expect(res.status).toBe("FAILED");
    expect(res).toMatchObject({
      error: {
        stage: "apply",
        code: "APPLY_FAILED",
        message: "grant write failed",
      },
    });

    expect(h.dbUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "be_apply_fail",
        status: { in: ["RECEIVED", "FAILED"] },
      },
      data: {
        status: "FAILED",
        processedAt: expect.any(Date),
        processingResult: {
          stage: "apply",
          code: "APPLY_FAILED",
          message: "grant write failed",
        },
      },
    });
    expect(h.dbUpdate).not.toHaveBeenCalled();
  });

  it("does not let stale FAILED overwrite durable PROCESSED", async () => {
    h.txFindUnique.mockResolvedValue({
      id: "be_race",
      status: "RECEIVED",
      organizationId: "orgA",
      payload: premiumStartedPayload("evt_race"),
    });
    h.txGrantCreateMany.mockRejectedValue(new Error("lost the race"));
    h.dbUpdateMany.mockResolvedValue({ count: 0 });
    h.dbFindUnique.mockResolvedValue({ status: "PROCESSED" });

    const res = await processPersistedBillingEventLifecycle("be_race");
    expect(res).toEqual({ ok: true, status: "SKIPPED" });
    expect(h.dbUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "be_race",
          status: { in: ["RECEIVED", "FAILED"] },
        },
      }),
    );
    expect(h.dbUpdate).not.toHaveBeenCalled();
  });
});
