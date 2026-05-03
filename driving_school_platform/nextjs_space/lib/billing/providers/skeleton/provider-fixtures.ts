import type {
  BillingEventType,
  BillingPlanKey,
  BillingProviderId,
} from "@/lib/billing/types";

export type ProviderLikeSubscriptionFixture = {
  provider: BillingProviderId;
  providerEventId: string;
  eventType: BillingEventType;
  organizationId: string;
  subscription: {
    externalId: string;
    status: "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED";
    planKey: BillingPlanKey;
    currentPeriodStartIso: string;
    currentPeriodEndIso: string;
  };
};

export function makeProviderLikeSubscriptionWebhookEnvelope(
  fx: ProviderLikeSubscriptionFixture,
): { headers: Record<string, string>; body: string } {
  return {
    headers: { "x-provider-event-id": fx.providerEventId },
    body: JSON.stringify({
      providerEventId: fx.providerEventId,
      eventType: fx.eventType,
      organizationId: fx.organizationId,
      payload: {
        subscription: {
          externalId: fx.subscription.externalId,
          status: fx.subscription.status,
          planKey: fx.subscription.planKey,
          currentPeriodStartIso: fx.subscription.currentPeriodStartIso,
          currentPeriodEndIso: fx.subscription.currentPeriodEndIso,
        },
      },
    }),
  };
}

export function fixtureSubscriptionActive(input?: {
  provider?: Exclude<BillingProviderId, "sibs">;
  organizationId?: string;
  planKey?: BillingPlanKey;
}): ProviderLikeSubscriptionFixture {
  return {
    provider: input?.provider ?? "stripe",
    providerEventId: "evt_fx_sub_active_1",
    eventType: "SUBSCRIPTION_STARTED",
    organizationId: input?.organizationId ?? "org_fx_1",
    subscription: {
      externalId: "sub_fx_1",
      status: "ACTIVE",
      planKey: input?.planKey ?? "PREMIUM",
      currentPeriodStartIso: "2026-05-01T00:00:00.000Z",
      currentPeriodEndIso: "2026-06-01T00:00:00.000Z",
    },
  };
}

export function fixtureSubscriptionSuspended(input?: {
  provider?: Exclude<BillingProviderId, "sibs">;
  organizationId?: string;
  planKey?: BillingPlanKey;
}): ProviderLikeSubscriptionFixture {
  return {
    provider: input?.provider ?? "stripe",
    providerEventId: "evt_fx_sub_suspended_1",
    eventType: "SUBSCRIPTION_RENEWED",
    organizationId: input?.organizationId ?? "org_fx_1",
    subscription: {
      externalId: "sub_fx_1",
      status: "SUSPENDED",
      planKey: input?.planKey ?? "PREMIUM",
      currentPeriodStartIso: "2026-05-01T00:00:00.000Z",
      currentPeriodEndIso: "2026-06-01T00:00:00.000Z",
    },
  };
}

export function fixtureSubscriptionPastDue(input?: {
  provider?: Exclude<BillingProviderId, "sibs">;
  organizationId?: string;
  planKey?: BillingPlanKey;
}): ProviderLikeSubscriptionFixture {
  return {
    provider: input?.provider ?? "stripe",
    providerEventId: "evt_fx_sub_past_due_1",
    eventType: "SUBSCRIPTION_RENEWED",
    organizationId: input?.organizationId ?? "org_fx_1",
    subscription: {
      externalId: "sub_fx_1",
      status: "PAST_DUE",
      planKey: input?.planKey ?? "PREMIUM",
      currentPeriodStartIso: "2026-05-01T00:00:00.000Z",
      currentPeriodEndIso: "2026-06-01T00:00:00.000Z",
    },
  };
}

export function fixtureSubscriptionCancelled(input?: {
  provider?: Exclude<BillingProviderId, "sibs">;
  organizationId?: string;
  planKey?: BillingPlanKey;
}): ProviderLikeSubscriptionFixture {
  return {
    provider: input?.provider ?? "stripe",
    providerEventId: "evt_fx_sub_cancelled_1",
    eventType: "SUBSCRIPTION_CANCELLED",
    organizationId: input?.organizationId ?? "org_fx_1",
    subscription: {
      externalId: "sub_fx_1",
      status: "CANCELLED",
      planKey: input?.planKey ?? "PREMIUM",
      currentPeriodStartIso: "2026-05-01T00:00:00.000Z",
      currentPeriodEndIso: "2026-06-01T00:00:00.000Z",
    },
  };
}
