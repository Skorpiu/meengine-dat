import { isSupportedBillingProviderId } from "@/lib/billing";
import {
  BILLING_WEBHOOK_CODES,
  billingWebhookJsonError,
} from "@/lib/billing/webhook-http";

type Params = { provider: string };

/**
 * Billing webhook security-containment boundary.
 *
 * Live PSP/provider authenticity verification is intentionally not implemented.
 * Until a provider can cryptographically prove webhook authenticity, supported
 * provider requests fail closed before request-body parsing, BillingEvent
 * persistence, or subscription/entitlement processing.
 *
 * Reopening processing requires a dedicated future Billing implementation slice
 * with provider-specific authenticity verification and security evidence.
 */
export async function POST(_request: Request, ctx: { params: Params }) {
  const providerParam = ctx?.params?.provider ?? "";

  if (!isSupportedBillingProviderId(providerParam)) {
    return billingWebhookJsonError(
      400,
      BILLING_WEBHOOK_CODES.unsupportedProvider,
      "Unsupported provider",
    );
  }

  return billingWebhookJsonError(
    503,
    BILLING_WEBHOOK_CODES.authenticityUnavailable,
  );
}
