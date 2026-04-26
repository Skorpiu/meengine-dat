import type {
  BillingCheckoutRequest,
  BillingCheckoutResponse,
  BillingProviderId,
  BillingWebhookInput,
  BillingWebhookParseResult,
} from "./types";

/**
 * Provider adapter boundary.
 *
 * No provider-specific SDK types should leak past this interface.
 */
export interface BillingProvider {
  readonly id: BillingProviderId;

  createCheckout(req: BillingCheckoutRequest): Promise<BillingCheckoutResponse>;

  parseWebhook(input: BillingWebhookInput): Promise<BillingWebhookParseResult>;
}
