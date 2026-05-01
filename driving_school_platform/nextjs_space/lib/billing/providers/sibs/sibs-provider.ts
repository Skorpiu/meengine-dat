import type { BillingProvider } from "@/lib/billing/provider";
import type {
  BillingCheckoutRequest,
  BillingCheckoutResponse,
  BillingEvent,
  BillingEventType,
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
    subscription: null,
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
