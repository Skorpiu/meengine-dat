import type { FeatureKey } from "@/lib/config/license-features";
import type { BillingPlanKey } from "./types";

/**
 * Explicit plan -> feature mapping.
 *
 * This is intentionally simple for now and does not affect runtime behavior
 * until a future projector uses it to grant/revoke entitlements.
 */
export const BILLING_PLAN_FEATURES: Record<BillingPlanKey, FeatureKey[]> = {
  BASE: [],
  PREMIUM: [
    "STUDENT_ACCESS",
    "VEHICLE_MANAGEMENT",
    "LESSON_MANAGEMENT",
    "SCREENSHOT_PROTECTION",
    "ADVANCED_REPORTING",
    "SMS_NOTIFICATIONS",
    "MOBILE_APP",
    "PAYMENT_INTEGRATION",
    "MULTI_LANGUAGE",
  ],
  ENTERPRISE: [
    "STUDENT_ACCESS",
    "VEHICLE_MANAGEMENT",
    "LESSON_MANAGEMENT",
    "SCREENSHOT_PROTECTION",
    "ADVANCED_REPORTING",
    "SMS_NOTIFICATIONS",
    "MOBILE_APP",
    "PAYMENT_INTEGRATION",
    "MULTI_LANGUAGE",
  ],
};
