import type { FeatureKey } from "@/lib/config/license-features";

/**
 * Billing boundary (provider-agnostic).
 *
 * Design goals:
 * - Normalize provider-specific concepts into stable internal types.
 * - Keep provider SDKs / crypto details out of the rest of the app.
 * - Enable a future projector to translate billing events into entitlements/subscription state.
 */

export type BillingProviderId = "sibs" | "stripe" | "paypal";

export type BillingEventType =
  | "CHECKOUT_SESSION_CREATED"
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_FAILED"
  | "SUBSCRIPTION_STARTED"
  | "SUBSCRIPTION_RENEWED"
  | "SUBSCRIPTION_CANCELLED"
  | "SUBSCRIPTION_EXPIRED"
  | "REFUND_ISSUED";

export type BillingSubscriptionStatus =
  | "ACTIVE"
  | "TRIAL"
  | "PAST_DUE"
  | "SUSPENDED"
  | "CANCELLED"
  | "EXPIRED";

/**
 * Provider-agnostic plan identifier.
 *
 * Intentionally aligned with the current Prisma `SubscriptionTier` values,
 * but kept as a pure string union so the billing core doesn't depend on Prisma.
 */
export type BillingPlanKey = "BASE" | "PREMIUM" | "ENTERPRISE";

export type BillingMoney = {
  currency: "EUR" | string;
  value: number;
};

/**
 * Normalized event emitted by billing providers.
 *
 * `providerEventId` MUST be used for idempotency.
 */
export type BillingEvent = {
  provider: BillingProviderId;
  providerEventId: string;
  type: BillingEventType;
  occurredAt: Date;
  organizationId: string | null;
  subscription: {
    externalId: string | null;
    status: BillingSubscriptionStatus | null;
    planKey: BillingPlanKey | null;
    currentPeriodEnd: Date | null;
  } | null;
  payment: {
    externalId: string | null;
    status: "SUCCEEDED" | "FAILED" | "PENDING" | null;
    money: BillingMoney | null;
  } | null;
  raw: unknown;
};

export type BillingCheckoutRequest = {
  organizationId: string;
  planKey: BillingPlanKey;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string | null;
  metadata?: Record<string, string>;
};

export type BillingCheckoutResponse = {
  provider: BillingProviderId;
  /**
   * URL to redirect the customer to a hosted checkout page.
   */
  redirectUrl: string;
  /**
   * Optional external identifier for later reconciliation.
   */
  checkoutExternalId?: string | null;
};

export type BillingWebhookInput = {
  headers: Record<string, string | undefined>;
  /**
   * Raw request body as received (usually text).
   * Providers like SIBS may deliver encrypted payloads.
   */
  body: string;
};

export type BillingWebhookParseResult = {
  /**
   * Normalized events derived from the webhook.
   * The caller is responsible for idempotent persistence & projection.
   */
  events: BillingEvent[];
};

export type BillingEntitlementsDelta = {
  enableFeatureKeys: FeatureKey[];
  disableFeatureKeys: FeatureKey[];
};

export type BillingProjection = {
  subscriptionPatch?: {
    status?: BillingSubscriptionStatus;
    planKey?: BillingPlanKey;
    currentPeriodEnd?: Date | null;
  };
  entitlementsDelta?: BillingEntitlementsDelta;
};

export interface BillingEventProjector {
  project(event: BillingEvent): BillingProjection;
}
