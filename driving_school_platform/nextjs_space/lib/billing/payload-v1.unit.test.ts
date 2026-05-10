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
        currentPeriodStart: new Date("2025-12-01T00:00:00.000Z"),
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
        currentPeriodStartIso: "2025-12-01T00:00:00.000Z",
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

  it.each(["ACTIVE", "TRIAL"] as const)(
    "parses %s subscription even when currentPeriodStartIso is missing (backwards compatible)",
    (status) => {
      const parsed = parseBillingEventPayloadV1({
        v: 1,
        provider: "stripe",
        providerEventId: `evt_sub_${status.toLowerCase()}_missing_start`,
        type: "SUBSCRIPTION_RENEWED",
        occurredAtIso: "2026-03-01T00:00:00.000Z",
        organizationId: "org_1",
        subscription: {
          externalId: "sub_1",
          status,
          planKey: "PREMIUM",
          currentPeriodEndIso: "2026-04-01T00:00:00.000Z",
        },
        payment: null,
      });

      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      expect(parsed.value.subscription?.currentPeriodStartIso).toBeUndefined();
    },
  );

  it.each([
    [
      "invalid subscription status",
      {
        v: 1,
        provider: "stripe",
        providerEventId: "evt_bad_status",
        type: "SUBSCRIPTION_RENEWED",
        occurredAtIso: "2026-03-01T00:00:00.000Z",
        organizationId: "org_1",
        subscription: {
          externalId: "sub_1",
          status: "NOPE",
          planKey: "PREMIUM",
          currentPeriodStartIso: "2026-03-01T00:00:00.000Z",
          currentPeriodEndIso: "2026-04-01T00:00:00.000Z",
        },
        payment: null,
      },
    ],
    [
      "invalid subscription planKey",
      {
        v: 1,
        provider: "stripe",
        providerEventId: "evt_bad_plan",
        type: "SUBSCRIPTION_RENEWED",
        occurredAtIso: "2026-03-01T00:00:00.000Z",
        organizationId: "org_1",
        subscription: {
          externalId: "sub_1",
          status: "ACTIVE",
          planKey: "GOLD",
          currentPeriodStartIso: "2026-03-01T00:00:00.000Z",
          currentPeriodEndIso: "2026-04-01T00:00:00.000Z",
        },
        payment: null,
      },
    ],
    [
      "invalid subscription period date",
      {
        v: 1,
        provider: "stripe",
        providerEventId: "evt_bad_period",
        type: "SUBSCRIPTION_RENEWED",
        occurredAtIso: "2026-03-01T00:00:00.000Z",
        organizationId: "org_1",
        subscription: {
          externalId: "sub_1",
          status: "ACTIVE",
          planKey: "PREMIUM",
          currentPeriodStartIso: "not-a-date",
          currentPeriodEndIso: "2026-04-01T00:00:00.000Z",
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
        occurredAtIso: "2026-03-01T00:00:00.000Z",
        organizationId: "org_1",
        subscription: {
          // externalId missing
          status: "ACTIVE",
          planKey: "PREMIUM",
          currentPeriodStartIso: "2026-03-01T00:00:00.000Z",
          currentPeriodEndIso: "2026-04-01T00:00:00.000Z",
        },
        payment: null,
      },
    ],
  ] as const)(
    "fails v1 parse for %s and cannot project entitlements",
    (_label, badPayload) => {
      const parsed = parseBillingEventPayloadV1(badPayload);
      expect(parsed.ok).toBe(false);
      if (parsed.ok) return;
      expect(parsed.error.code).toMatch(/MISSING_FIELDS|INVALID_FIELDS/);
    },
  );

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
        currentPeriodStartIso: "2026-03-01T00:00:00.000Z",
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
      currentPeriodStart: new Date("2026-03-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-04-01T00:00:00.000Z"),
    });
    expect(
      projection.entitlementsDelta?.enableFeatureKeys.length,
    ).toBeGreaterThan(0);
  });

  it("policy: PAST_DUE updates subscription status but does not disable (or enable) plan features", () => {
    const parsed = parseBillingEventPayloadV1({
      v: 1,
      provider: "stripe",
      providerEventId: "evt_sub_past_due_1",
      type: "SUBSCRIPTION_RENEWED",
      occurredAtIso: "2026-03-10T00:00:00.000Z",
      organizationId: "org_1",
      subscription: {
        externalId: "sub_1",
        status: "PAST_DUE",
        planKey: "PREMIUM",
        currentPeriodEndIso: "2026-04-01T00:00:00.000Z",
      },
      payment: null,
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const projection = projectBillingEventPayloadV1(parsed.value);
    expect(projection.subscriptionPatch?.status).toBe("PAST_DUE");
    expect(projection.entitlementsDelta).toEqual({
      enableFeatureKeys: [],
      disableFeatureKeys: [],
    });
  });

  it("policy: SUSPENDED disables billing-granted plan features", () => {
    const parsed = parseBillingEventPayloadV1({
      v: 1,
      provider: "stripe",
      providerEventId: "evt_sub_suspended_1",
      type: "SUBSCRIPTION_RENEWED",
      occurredAtIso: "2026-03-10T00:00:00.000Z",
      organizationId: "org_1",
      subscription: {
        externalId: "sub_1",
        status: "SUSPENDED",
        planKey: "PREMIUM",
        currentPeriodEndIso: "2026-04-01T00:00:00.000Z",
      },
      payment: null,
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const projection = projectBillingEventPayloadV1(parsed.value);
    expect(projection.subscriptionPatch?.status).toBe("SUSPENDED");
    expect(projection.entitlementsDelta?.enableFeatureKeys).toEqual([]);
    expect(
      projection.entitlementsDelta?.disableFeatureKeys.length,
    ).toBeGreaterThan(0);
  });

  it.each(["CANCELLED", "EXPIRED"] as const)(
    "policy: %s disables billing-granted plan features",
    (status) => {
      const parsed = parseBillingEventPayloadV1({
        v: 1,
        provider: "stripe",
        providerEventId: `evt_sub_${status.toLowerCase()}_1`,
        type: "SUBSCRIPTION_RENEWED",
        occurredAtIso: "2026-03-10T00:00:00.000Z",
        organizationId: "org_1",
        subscription: {
          externalId: "sub_1",
          status,
          planKey: "PREMIUM",
          currentPeriodEndIso: "2026-04-01T00:00:00.000Z",
        },
        payment: null,
      });

      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;

      const projection = projectBillingEventPayloadV1(parsed.value);
      expect(projection.subscriptionPatch?.status).toBe(status);
      expect(projection.entitlementsDelta?.enableFeatureKeys).toEqual([]);
      expect(
        projection.entitlementsDelta?.disableFeatureKeys.length,
      ).toBeGreaterThan(0);
    },
  );
});
