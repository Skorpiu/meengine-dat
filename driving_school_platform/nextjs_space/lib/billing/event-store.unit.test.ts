import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const createMock = vi.fn();
  const findUniqueMock = vi.fn();
  const updateMock = vi.fn();
  const updateManyMock = vi.fn();

  const prismaMock = {
    billingEvent: {
      create: createMock,
      findUnique: findUniqueMock,
      update: updateMock,
      updateMany: updateManyMock,
    },
  };

  return {
    prismaMock,
    createMock,
    findUniqueMock,
    updateMock,
    updateManyMock,
  };
});

vi.mock("@/lib/db", () => ({
  db: h.prismaMock,
}));

import {
  recordBillingEvent,
  getBillingEventByProviderEventId,
  markBillingEventFailed,
  markBillingEventFailedIfProcessable,
  markBillingEventProcessed,
  lockBillingEventRowForUpdate,
  toBillingProcessingFailureJson,
} from "./event-store";

describe("billing event store (idempotent foundation)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates a new row on first record", async () => {
    h.createMock.mockResolvedValue({ id: "e1" });

    const res = await recordBillingEvent({
      provider: "sibs",
      providerEventId: "evt_1",
      eventType: "PAYMENT_SUCCEEDED",
      organizationId: "org_1",
      payload: { ok: true },
    });

    expect(res).toEqual({ id: "e1" });
    expect(h.createMock).toHaveBeenCalledTimes(1);
  });

  it("is idempotent on duplicate provider+providerEventId (returns existing unchanged)", async () => {
    const uniqueErr = { code: "P2002" };
    h.createMock.mockRejectedValue(uniqueErr);
    h.findUniqueMock.mockResolvedValue({
      id: "existing",
      providerEventId: "evt_1",
    });

    const res = await recordBillingEvent({
      provider: "sibs",
      providerEventId: "evt_1",
      eventType: "PAYMENT_SUCCEEDED",
      organizationId: "org_1",
      payload: { ok: true },
    });

    expect(res).toEqual({ id: "existing", providerEventId: "evt_1" });
    expect(h.findUniqueMock).toHaveBeenCalledTimes(1);
  });

  it("getBillingEventByProviderEventId queries using the compound unique", async () => {
    h.findUniqueMock.mockResolvedValue({ id: "x" });

    const res = await getBillingEventByProviderEventId("stripe", "evt_99");

    expect(res).toEqual({ id: "x" });
    expect(h.findUniqueMock).toHaveBeenCalledWith({
      where: {
        provider_providerEventId: {
          provider: "STRIPE",
          providerEventId: "evt_99",
        },
      },
    });
  });

  it("marks an event as PROCESSED with processedAt and processingResult", async () => {
    h.updateMock.mockResolvedValue({ id: "e1", status: "PROCESSED" });

    const res = await markBillingEventProcessed("e1", { ok: true });

    expect(res).toEqual({ id: "e1", status: "PROCESSED" });
    expect(h.updateMock).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: {
        status: "PROCESSED",
        processedAt: expect.any(Date),
        processingResult: { ok: true },
      },
    });
  });

  it("marks an event as FAILED with processedAt and processingResult", async () => {
    h.updateMock.mockResolvedValue({ id: "e2", status: "FAILED" });

    const res = await markBillingEventFailed("e2", {
      error: "boom",
      retryable: false,
    });

    expect(res).toEqual({ id: "e2", status: "FAILED" });
    expect(h.updateMock).toHaveBeenCalledWith({
      where: { id: "e2" },
      data: {
        status: "FAILED",
        processedAt: expect.any(Date),
        processingResult: { error: "boom", retryable: false },
      },
    });
  });

  it("locks a billing_events row with FOR UPDATE through the transaction client", async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ id: "e1" }]);

    await lockBillingEventRowForUpdate({ $queryRaw: queryRaw }, "e1");

    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("serializes unknown apply errors into JSON-safe failure records", () => {
    const fromError = toBillingProcessingFailureJson(
      "apply",
      new Error("db exploded"),
    );
    expect(fromError).toEqual({
      stage: "apply",
      code: "APPLY_FAILED",
      message: "db exploded",
    });

    const fromObject = toBillingProcessingFailureJson("apply", {
      code: "P2003",
      message: "FK failed",
    });
    expect(fromObject).toEqual({
      stage: "apply",
      code: "P2003",
      message: "FK failed",
    });
  });

  it("conditionally marks FAILED only for processable statuses", async () => {
    h.updateManyMock.mockResolvedValue({ count: 1 });

    const res = await markBillingEventFailedIfProcessable("e3", {
      stage: "apply",
      code: "APPLY_FAILED",
      message: "rolled back",
    });

    expect(res).toEqual({ outcome: "updated", status: "FAILED" });
    expect(h.updateManyMock).toHaveBeenCalledWith({
      where: {
        id: "e3",
        status: { in: ["RECEIVED", "FAILED"] },
      },
      data: {
        status: "FAILED",
        processedAt: expect.any(Date),
        processingResult: {
          stage: "apply",
          code: "APPLY_FAILED",
          message: "rolled back",
        },
      },
    });
    expect(h.updateMock).not.toHaveBeenCalled();
  });

  it("does not overwrite PROCESSED when conditional FAILED matches zero rows", async () => {
    h.updateManyMock.mockResolvedValue({ count: 0 });
    h.findUniqueMock.mockResolvedValue({ status: "PROCESSED" });

    const res = await markBillingEventFailedIfProcessable("e4", {
      stage: "apply",
      code: "APPLY_FAILED",
      message: "stale failure",
    });

    expect(res).toEqual({ outcome: "already_processed", status: "PROCESSED" });
    expect(h.updateMock).not.toHaveBeenCalled();
  });
});
