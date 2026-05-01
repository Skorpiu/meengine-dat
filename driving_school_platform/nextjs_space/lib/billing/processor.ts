import type { BillingProjection } from "./types";
import {
  parseBillingEventPayloadV1,
  projectBillingEventPayloadV1,
  type BillingPayloadParseError,
} from "./payload-v1";
import { db } from "@/lib/db";
import { subscriptionTierFromBillingPlanKey } from "./prisma-bridge";
import { SubscriptionStatus } from "@prisma/client";
import type { BillingSubscriptionStatus } from "./types";

export type BillingProcessResult =
  | { ok: true; projection: BillingProjection }
  | { ok: false; error: BillingPayloadParseError };

/**
 * Minimal processor: take a persisted BillingEvent.payload and produce a projection.
 *
 * This intentionally depends only on the explicit BillingEventPayloadV1 shape (via the codec),
 * so the rest of the system doesn't rely on implicit/loose JSON payloads.
 */
export function processPersistedBillingEventPayload(
  payload: unknown,
): BillingProcessResult {
  const parsed = parseBillingEventPayloadV1(payload);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  return { ok: true, projection: projectBillingEventPayloadV1(parsed.value) };
}

function toSubscriptionStatus(
  status: BillingSubscriptionStatus,
): SubscriptionStatus {
  switch (status) {
    case "ACTIVE":
      return SubscriptionStatus.ACTIVE;
    case "TRIAL":
      return SubscriptionStatus.TRIAL;
    case "EXPIRED":
      return SubscriptionStatus.EXPIRED;
    case "CANCELLED":
      return SubscriptionStatus.CANCELLED;
    case "SUSPENDED":
      return SubscriptionStatus.SUSPENDED;
    case "PAST_DUE":
      // closest equivalent in current DB enum
      return SubscriptionStatus.SUSPENDED;
  }
}

export async function applyBillingProjectionForOrganization(input: {
  organizationId: string;
  occurredAt: Date;
  projection: BillingProjection;
}): Promise<void> {
  const patch = input.projection.subscriptionPatch;
  if (patch) {
    await db.organization.update({
      where: { id: input.organizationId },
      data: {
        subscriptionTier: patch.planKey
          ? subscriptionTierFromBillingPlanKey(patch.planKey)
          : undefined,
        subscriptionStatus: patch.status
          ? toSubscriptionStatus(patch.status)
          : undefined,
        subscriptionEndsAt:
          typeof patch.currentPeriodEnd === "undefined"
            ? undefined
            : patch.currentPeriodEnd,
      },
    });
  }

  const disableKeys =
    input.projection.entitlementsDelta?.disableFeatureKeys ?? [];
  if (disableKeys.length > 0) {
    await db.entitlementGrant.updateMany({
      where: {
        organizationId: input.organizationId,
        source: "BILLING",
        featureKey: { in: disableKeys },
        startsAt: { lte: input.occurredAt },
        OR: [{ expiresAt: null }, { expiresAt: { gt: input.occurredAt } }],
      },
      data: { expiresAt: input.occurredAt },
    });
  }

  const enableKeys =
    input.projection.entitlementsDelta?.enableFeatureKeys ?? [];
  const expiresAt = patch?.currentPeriodEnd ?? null;
  const startsAt = patch?.currentPeriodStart ?? input.occurredAt;

  const shouldGrant =
    (patch?.status === "ACTIVE" || patch?.status === "TRIAL") &&
    enableKeys.length > 0;

  if (!shouldGrant) return;

  await db.entitlementGrant.createMany({
    data: enableKeys.map((featureKey) => ({
      organizationId: input.organizationId,
      featureKey,
      source: "BILLING",
      startsAt,
      expiresAt,
    })),
  });
}
