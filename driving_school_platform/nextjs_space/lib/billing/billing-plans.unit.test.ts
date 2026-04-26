import { describe, it, expect } from "vitest";
import { SubscriptionTier } from "@prisma/client";
import { FEATURE_KEYS } from "@/lib/config/license-features";
import {
  BILLING_PLAN_FEATURES,
  billingPlanKeyFromSubscriptionTier,
  subscriptionTierFromBillingPlanKey,
} from "./index";

describe("billing plan mapping (foundation)", () => {
  it("BASE has no premium features by default", () => {
    expect(BILLING_PLAN_FEATURES.BASE).toEqual([]);
  });

  it("PREMIUM and ENTERPRISE are explicit and only contain known FeatureKeys", () => {
    const all = new Set(FEATURE_KEYS);
    for (const key of BILLING_PLAN_FEATURES.PREMIUM) {
      expect(all.has(key)).toBe(true);
    }
    for (const key of BILLING_PLAN_FEATURES.ENTERPRISE) {
      expect(all.has(key)).toBe(true);
    }
  });

  it("prisma bridge functions are round-trip safe", () => {
    const tiers = [
      SubscriptionTier.BASE,
      SubscriptionTier.PREMIUM,
      SubscriptionTier.ENTERPRISE,
    ] as const;

    for (const t of tiers) {
      const planKey = billingPlanKeyFromSubscriptionTier(t);
      const back = subscriptionTierFromBillingPlanKey(planKey);
      expect(back).toBe(t);
    }
  });
});
