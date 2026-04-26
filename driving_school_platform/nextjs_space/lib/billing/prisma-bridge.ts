import { SubscriptionTier } from "@prisma/client";
import type { BillingPlanKey } from "./types";

/**
 * Bridge helpers between billing boundary and current DB enums.
 *
 * Keep Prisma imports isolated here so the rest of `lib/billing/*` stays
 * provider-agnostic and storage-agnostic.
 */
export function billingPlanKeyFromSubscriptionTier(
  tier: SubscriptionTier,
): BillingPlanKey {
  switch (tier) {
    case SubscriptionTier.BASE:
      return "BASE";
    case SubscriptionTier.PREMIUM:
      return "PREMIUM";
    case SubscriptionTier.ENTERPRISE:
      return "ENTERPRISE";
  }
}

export function subscriptionTierFromBillingPlanKey(
  key: BillingPlanKey,
): SubscriptionTier {
  switch (key) {
    case "BASE":
      return SubscriptionTier.BASE;
    case "PREMIUM":
      return SubscriptionTier.PREMIUM;
    case "ENTERPRISE":
      return SubscriptionTier.ENTERPRISE;
  }
}
