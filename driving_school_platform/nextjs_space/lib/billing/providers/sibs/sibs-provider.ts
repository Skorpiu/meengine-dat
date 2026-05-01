import type { BillingProvider } from "@/lib/billing/provider";
import type {
  BillingCheckoutRequest,
  BillingCheckoutResponse,
  BillingEvent,
  BillingEventType,
  BillingPlanKey,
  BillingSubscriptionStatus,
  BillingWebhookInput,
  BillingWebhookParseResult,
} from "@/lib/billing/types";

type SibsWebhookEnvelope = {
  providerEventId?: unknown;
  eventType?: unknown;
  organizationId?: unknown;
  payload?: unknown;
};

function isBillingEventType(x: unknown): x is BillingEventType {
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

function pickProviderEventId(input: BillingWebhookInput): string | null {
  return (
    input.headers["x-provider-event-id"] ??
    input.headers["x-event-id"] ??
    input.headers["x-sibs-event-id"] ??
    null
  );
}

function tryParseJsonEnvelope(raw: string): SibsWebhookEnvelope | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as SibsWebhookEnvelope;
  } catch {
    return null;
  }
}

function asObject(x: unknown): Record<string, unknown> | null {
  if (!x || typeof x !== "object") return null;
  return x as Record<string, unknown>;
}

function isSubscriptionStatus(x: unknown): x is BillingSubscriptionStatus {
  return (
    x === "ACTIVE" ||
    x === "TRIAL" ||
    x === "PAST_DUE" ||
    x === "SUSPENDED" ||
    x === "CANCELLED" ||
    x === "EXPIRED"
  );
}

function isPlanKey(x: unknown): x is BillingPlanKey {
  return x === "BASE" || x === "PREMIUM" || x === "ENTERPRISE";
}

function toDateOrNull(x: unknown): Date | null {
  if (x === null) return null;
  if (x instanceof Date) return x;
  if (typeof x === "string") {
    const ms = Date.parse(x);
    if (!Number.isNaN(ms)) return new Date(ms);
  }
  return null;
}

function tryParseSubscriptionFromRawPayload(
  rawPayload: unknown,
): BillingEvent["subscription"] | null {
  const root = asObject(rawPayload);
  const subObj = root ? asObject(root.subscription) : null;
  if (!subObj) return null;

  const externalId =
    typeof subObj.externalId === "string" ? subObj.externalId : null;
  const status = isSubscriptionStatus(subObj.status) ? subObj.status : null;
  const planKey = isPlanKey(subObj.planKey) ? subObj.planKey : null;

  const currentPeriodStart =
    toDateOrNull(subObj.currentPeriodStartIso) ??
    toDateOrNull(subObj.currentPeriodStart);
  const currentPeriodEnd =
    toDateOrNull(subObj.currentPeriodEndIso) ??
    toDateOrNull(subObj.currentPeriodEnd);

  if (
    !externalId &&
    !status &&
    !planKey &&
    !currentPeriodStart &&
    !currentPeriodEnd
  ) {
    return null;
  }

  return {
    externalId,
    status,
    planKey,
    currentPeriodStart,
    currentPeriodEnd,
  };
}

function normalizeWebhookToSingleEvent(
  input: BillingWebhookInput,
): BillingEvent | null {
  const envelope = tryParseJsonEnvelope(input.body);
  const fromBody =
    envelope?.providerEventId && typeof envelope.providerEventId === "string"
      ? envelope.providerEventId
      : null;

  const providerEventId = fromBody ?? pickProviderEventId(input);
  if (!providerEventId) return null;

  const type: BillingEventType = isBillingEventType(envelope?.eventType)
    ? (envelope!.eventType as BillingEventType)
    : "CHECKOUT_SESSION_CREATED";

  const organizationId =
    typeof envelope?.organizationId === "string"
      ? envelope.organizationId
      : null;

  const rawPayload =
    typeof envelope?.payload !== "undefined"
      ? envelope.payload
      : (envelope ?? input.body);

  const event: BillingEvent = {
    provider: "sibs",
    providerEventId,
    type,
    occurredAt: new Date(0),
    organizationId,
    subscription: tryParseSubscriptionFromRawPayload(rawPayload),
    payment: null,
    raw: {
      headers: input.headers,
      body: input.body,
      parsed: envelope,
      payload: rawPayload,
    },
  };

  return event;
}

export const sibsBillingProvider: BillingProvider = {
  id: "sibs",

  async createCheckout(
    req: BillingCheckoutRequest,
  ): Promise<BillingCheckoutResponse> {
    const checkoutExternalId = `sibs_co_stub_${req.organizationId}_${req.planKey}`;
    const redirectUrl = `https://checkout.sibs.invalid/session/${encodeURIComponent(
      checkoutExternalId,
    )}?success=${encodeURIComponent(req.successUrl)}&cancel=${encodeURIComponent(
      req.cancelUrl,
    )}`;

    return {
      provider: "sibs",
      redirectUrl,
      checkoutExternalId,
    };
  },

  async parseWebhook(
    input: BillingWebhookInput,
  ): Promise<BillingWebhookParseResult> {
    const event = normalizeWebhookToSingleEvent(input);
    return { events: event ? [event] : [] };
  },
};
