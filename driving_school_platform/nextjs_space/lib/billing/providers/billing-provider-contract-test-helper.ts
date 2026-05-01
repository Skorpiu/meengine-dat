import { expect } from "vitest";
import type {
  BillingEvent,
  BillingPlanKey,
  BillingProviderId,
  BillingSubscriptionStatus,
} from "@/lib/billing/types";
import {
  billingEventToPayloadV1,
  parseBillingEventPayloadV1,
} from "@/lib/billing/payload-v1";

export type BillingProviderSubscriptionContractExpectations = {
  provider: BillingProviderId;
  organizationId?: string | null;
  subscriptionStatus?: BillingSubscriptionStatus | null;
  planKey?: BillingPlanKey | null;
  currentPeriodStartIso?: string | null | undefined;
  currentPeriodEndIso?: string | null;
};

export function assertBillingProviderSubscriptionPayloadContract(
  event: BillingEvent,
  expectations: BillingProviderSubscriptionContractExpectations,
): void {
  const payload = billingEventToPayloadV1(event);

  expect(payload.v).toBe(1);
  expect(payload.provider).toBe(expectations.provider);
  expect(typeof payload.providerEventId).toBe("string");
  expect(payload.providerEventId.length).toBeGreaterThan(0);
  expect(typeof payload.occurredAtIso).toBe("string");
  expect(Number.isNaN(Date.parse(payload.occurredAtIso))).toBe(false);

  if (Object.prototype.hasOwnProperty.call(expectations, "organizationId")) {
    expect(payload.organizationId).toBe(expectations.organizationId);
  }

  expect(payload.subscription).not.toBeNull();
  if (!payload.subscription) return;

  expect(payload.subscription.status).toBe(expectations.subscriptionStatus);
  expect(payload.subscription.planKey).toBe(expectations.planKey);

  if (
    Object.prototype.hasOwnProperty.call(expectations, "currentPeriodStartIso")
  ) {
    expect(payload.subscription.currentPeriodStartIso).toBe(
      expectations.currentPeriodStartIso,
    );
  }
  if (
    Object.prototype.hasOwnProperty.call(expectations, "currentPeriodEndIso")
  ) {
    expect(payload.subscription.currentPeriodEndIso).toBe(
      expectations.currentPeriodEndIso,
    );
  }

  const parsed = parseBillingEventPayloadV1(payload);
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;

  expect(parsed.value).toMatchObject({
    v: 1,
    provider: expectations.provider,
    providerEventId: payload.providerEventId,
    occurredAtIso: payload.occurredAtIso,
    organizationId: payload.organizationId,
  });
}
