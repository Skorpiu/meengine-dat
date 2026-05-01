import type { BillingProvider } from "@/lib/billing/provider";
import type {
  BillingCheckoutRequest,
  BillingCheckoutResponse,
  BillingEvent,
  BillingEventType,
  BillingProviderId,
  BillingWebhookInput,
  BillingWebhookParseResult,
} from "@/lib/billing/types";

type EnvelopeBody = {
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
    input.headers["x-provider-event-id"] ?? input.headers["x-event-id"] ?? null
  );
}

function tryParseEnvelope(raw: string): EnvelopeBody | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as EnvelopeBody;
  } catch {
    return null;
  }
}

export function createEnvelopeBillingProvider(
  id: Exclude<BillingProviderId, "sibs">,
): BillingProvider {
  return {
    id,

    async createCheckout(
      req: BillingCheckoutRequest,
    ): Promise<BillingCheckoutResponse> {
      const checkoutExternalId = `${id}_co_stub_${req.organizationId}_${req.planKey}`;
      return {
        provider: id,
        redirectUrl: `https://checkout.${id}.invalid/session/${encodeURIComponent(
          checkoutExternalId,
        )}`,
        checkoutExternalId,
      };
    },

    async parseWebhook(
      input: BillingWebhookInput,
    ): Promise<BillingWebhookParseResult> {
      const envelope = tryParseEnvelope(input.body);
      const fromBody =
        envelope?.providerEventId &&
        typeof envelope.providerEventId === "string"
          ? envelope.providerEventId
          : null;
      const providerEventId = fromBody ?? pickProviderEventId(input);
      if (!providerEventId) return { events: [] };

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
        provider: id,
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

      return { events: [event] };
    },
  };
}
