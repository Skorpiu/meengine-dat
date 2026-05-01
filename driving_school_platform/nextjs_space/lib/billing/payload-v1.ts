import { BILLING_PLAN_FEATURES } from "./billing-plans";
import type {
  BillingEntitlementsDelta,
  BillingEvent,
  BillingEventType,
  BillingPlanKey,
  BillingProjection,
  BillingProviderId,
  BillingSubscriptionStatus,
} from "./types";

export type BillingEventPayloadV1 = {
  v: 1;
  provider: BillingProviderId;
  providerEventId: string;
  type: BillingEventType;
  occurredAtIso: string;
  organizationId: string | null;
  subscription: {
    externalId: string | null;
    status: BillingSubscriptionStatus | null;
    planKey: BillingPlanKey | null;
    currentPeriodStartIso?: string | null;
    currentPeriodEndIso: string | null;
  } | null;
  payment: {
    externalId: string | null;
    status: "SUCCEEDED" | "FAILED" | "PENDING" | null;
    money: { currency: string; value: number } | null;
  } | null;
  /**
   * Provider raw payload (optional). This field exists for debugging / audit.
   * Treat as opaque JSON; do not depend on its structure in projectors.
   */
  raw?: unknown;
};

export type BillingPayloadParseError = {
  code:
    | "NOT_OBJECT"
    | "UNSUPPORTED_VERSION"
    | "MISSING_FIELDS"
    | "INVALID_FIELDS";
  message: string;
};

export type BillingPayloadParseResult =
  | { ok: true; value: BillingEventPayloadV1 }
  | { ok: false; error: BillingPayloadParseError };

function isProviderId(x: unknown): x is BillingProviderId {
  return x === "sibs" || x === "stripe" || x === "paypal";
}

function isEventType(x: unknown): x is BillingEventType {
  return (
    x === "CHECKOUT_SESSION_CREATED" ||
    x === "PAYMENT_SUCCEEDED" ||
    x === "PAYMENT_FAILED" ||
    x === "SUBSCRIPTION_STARTED" ||
    x === "SUBSCRIPTION_RENEWED" ||
    x === "SUBSCRIPTION_CANCELLED" ||
    x === "SUBSCRIPTION_EXPIRED" ||
    x === "REFUND_ISSUED"
  );
}

function isIsoString(x: unknown): x is string {
  if (typeof x !== "string") return false;
  // Minimal ISO check; `Date.parse` accepts some non-ISO formats, but this is enough for v1.
  return !Number.isNaN(Date.parse(x));
}

function asObject(x: unknown): Record<string, unknown> | null {
  if (!x || typeof x !== "object") return null;
  return x as Record<string, unknown>;
}

function toIso(d: unknown): string | null {
  if (d instanceof Date) return d.toISOString();
  if (typeof d === "string" && !Number.isNaN(Date.parse(d)))
    return new Date(d).toISOString();
  return null;
}

/**
 * Parse/normalize a stored BillingEvent payload into the explicit V1 shape.
 *
 * Supports:
 * - V1 payloads (explicit)
 * - legacy stored `BillingEvent` objects (from earlier skeleton wiring)
 */
export function parseBillingEventPayloadV1(
  input: unknown,
): BillingPayloadParseResult {
  const obj = asObject(input);
  if (!obj) {
    return {
      ok: false,
      error: { code: "NOT_OBJECT", message: "Payload must be an object" },
    };
  }

  // Already v1?
  if (obj.v === 1) {
    const provider = obj.provider;
    const providerEventId = obj.providerEventId;
    const type = obj.type;
    const occurredAtIso = obj.occurredAtIso;

    if (
      !isProviderId(provider) ||
      typeof providerEventId !== "string" ||
      !isEventType(type) ||
      !isIsoString(occurredAtIso)
    ) {
      return {
        ok: false,
        error: { code: "INVALID_FIELDS", message: "Invalid v1 payload fields" },
      };
    }

    const organizationId =
      typeof obj.organizationId === "string" ? obj.organizationId : null;

    // subscription
    const subObj = obj.subscription ? asObject(obj.subscription) : null;
    const subscription =
      obj.subscription === null
        ? null
        : subObj
          ? {
              externalId:
                typeof subObj.externalId === "string"
                  ? subObj.externalId
                  : null,
              status:
                typeof subObj.status === "string"
                  ? (subObj.status as BillingSubscriptionStatus)
                  : null,
              planKey:
                typeof subObj.planKey === "string"
                  ? (subObj.planKey as BillingPlanKey)
                  : null,
              currentPeriodStartIso:
                typeof subObj.currentPeriodStartIso === "string" ||
                subObj.currentPeriodStartIso === null ||
                typeof subObj.currentPeriodStartIso === "undefined"
                  ? (subObj.currentPeriodStartIso as string | null | undefined)
                  : null,
              currentPeriodEndIso:
                typeof subObj.currentPeriodEndIso === "string" ||
                subObj.currentPeriodEndIso === null
                  ? (subObj.currentPeriodEndIso as string | null)
                  : null,
            }
          : null;

    const payObj = obj.payment ? asObject(obj.payment) : null;
    const payment =
      obj.payment === null
        ? null
        : payObj
          ? {
              externalId:
                typeof payObj.externalId === "string"
                  ? payObj.externalId
                  : null,
              status:
                payObj.status === "SUCCEEDED" ||
                payObj.status === "FAILED" ||
                payObj.status === "PENDING" ||
                payObj.status === null
                  ? (payObj.status as "SUCCEEDED" | "FAILED" | "PENDING" | null)
                  : null,
              money:
                payObj.money && typeof payObj.money === "object"
                  ? {
                      currency:
                        typeof (payObj.money as Record<string, unknown>)
                          .currency === "string"
                          ? ((payObj.money as Record<string, unknown>)
                              .currency as string)
                          : "EUR",
                      value:
                        typeof (payObj.money as Record<string, unknown>)
                          .value === "number"
                          ? ((payObj.money as Record<string, unknown>)
                              .value as number)
                          : 0,
                    }
                  : null,
            }
          : null;

    return {
      ok: true,
      value: {
        v: 1,
        provider,
        providerEventId,
        type,
        occurredAtIso: new Date(occurredAtIso).toISOString(),
        organizationId,
        subscription,
        payment,
        raw: obj.raw,
      },
    };
  }

  // Legacy: stored normalized BillingEvent
  // (provider, providerEventId, type, occurredAt, organizationId, subscription, payment, raw)
  const provider = obj.provider;
  const providerEventId = obj.providerEventId;
  const type = obj.type;
  const occurredAtIso = toIso(obj.occurredAt);

  if (
    !isProviderId(provider) ||
    typeof providerEventId !== "string" ||
    !isEventType(type)
  ) {
    return {
      ok: false,
      error: {
        code: "MISSING_FIELDS",
        message: "Missing provider/providerEventId/type",
      },
    };
  }
  if (!occurredAtIso) {
    return {
      ok: false,
      error: { code: "INVALID_FIELDS", message: "Invalid occurredAt" },
    };
  }

  const organizationId =
    typeof obj.organizationId === "string" ? obj.organizationId : null;

  const subObj = obj.subscription ? asObject(obj.subscription) : null;
  const subscription =
    obj.subscription === null
      ? null
      : subObj
        ? {
            externalId:
              typeof subObj.externalId === "string" ? subObj.externalId : null,
            status:
              typeof subObj.status === "string"
                ? (subObj.status as BillingSubscriptionStatus)
                : null,
            planKey:
              typeof subObj.planKey === "string"
                ? (subObj.planKey as BillingPlanKey)
                : null,
            currentPeriodStartIso: toIso(subObj.currentPeriodStart),
            currentPeriodEndIso: toIso(subObj.currentPeriodEnd),
          }
        : null;

  const payObj = obj.payment ? asObject(obj.payment) : null;
  const payment =
    obj.payment === null
      ? null
      : payObj
        ? {
            externalId:
              typeof payObj.externalId === "string" ? payObj.externalId : null,
            status:
              payObj.status === "SUCCEEDED" ||
              payObj.status === "FAILED" ||
              payObj.status === "PENDING" ||
              payObj.status === null
                ? (payObj.status as "SUCCEEDED" | "FAILED" | "PENDING" | null)
                : null,
            money:
              payObj.money && typeof payObj.money === "object"
                ? {
                    currency:
                      typeof (payObj.money as Record<string, unknown>)
                        .currency === "string"
                        ? ((payObj.money as Record<string, unknown>)
                            .currency as string)
                        : "EUR",
                    value:
                      typeof (payObj.money as Record<string, unknown>).value ===
                      "number"
                        ? ((payObj.money as Record<string, unknown>)
                            .value as number)
                        : 0,
                  }
                : null,
          }
        : null;

  return {
    ok: true,
    value: {
      v: 1,
      provider,
      providerEventId,
      type,
      occurredAtIso,
      organizationId,
      subscription,
      payment,
      raw: obj.raw,
    },
  };
}

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

export function projectBillingEventPayloadV1(
  payload: BillingEventPayloadV1,
): BillingProjection {
  const sub = payload.subscription;
  if (!sub) return {};

  const projection: BillingProjection = {};

  if (
    sub.status ||
    sub.planKey ||
    typeof sub.currentPeriodStartIso !== "undefined" ||
    typeof sub.currentPeriodEndIso !== "undefined"
  ) {
    projection.subscriptionPatch = {
      status: sub.status ?? undefined,
      planKey: sub.planKey ?? undefined,
      currentPeriodStart:
        typeof sub.currentPeriodStartIso === "undefined"
          ? undefined
          : sub.currentPeriodStartIso
            ? new Date(sub.currentPeriodStartIso)
            : null,
      currentPeriodEnd: sub.currentPeriodEndIso
        ? new Date(sub.currentPeriodEndIso)
        : null,
    };
  }

  if (sub.planKey) {
    const enableFeatureKeys = BILLING_PLAN_FEATURES[sub.planKey] ?? [];
    projection.entitlementsDelta = {
      enableFeatureKeys: unique(enableFeatureKeys),
      disableFeatureKeys:
        sub.status === "CANCELLED" || sub.status === "EXPIRED"
          ? unique(enableFeatureKeys)
          : [],
    } satisfies BillingEntitlementsDelta;
  }

  return projection;
}

/**
 * Helper to create a V1 payload from an in-memory BillingEvent.
 * (Useful for adapters and tests.)
 */
export function billingEventToPayloadV1(
  event: BillingEvent,
): BillingEventPayloadV1 {
  return {
    v: 1,
    provider: event.provider,
    providerEventId: event.providerEventId,
    type: event.type,
    occurredAtIso: event.occurredAt.toISOString(),
    organizationId: event.organizationId,
    subscription: event.subscription
      ? {
          externalId: event.subscription.externalId,
          status: event.subscription.status,
          planKey: event.subscription.planKey,
          currentPeriodStartIso: event.subscription.currentPeriodStart
            ? event.subscription.currentPeriodStart.toISOString()
            : null,
          currentPeriodEndIso: event.subscription.currentPeriodEnd
            ? event.subscription.currentPeriodEnd.toISOString()
            : null,
        }
      : null,
    payment: event.payment
      ? {
          externalId: event.payment.externalId,
          status: event.payment.status,
          money: event.payment.money
            ? {
                currency: event.payment.money.currency,
                value: event.payment.money.value,
              }
            : null,
        }
      : null,
    raw: event.raw,
  };
}
