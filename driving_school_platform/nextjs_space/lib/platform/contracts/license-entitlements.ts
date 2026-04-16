import type { FeatureKey } from "@/lib/config/license-features";

/**
 * Licensing entitlements contract (admin scope).
 *
 * Boundary rule:
 * - API returns entitlements (enabled keys) + minimal org metadata.
 * - UI is responsible for joining with the local feature catalog (labels/icons/category).
 */

export type AdminLicenseEntitlementsGetResponse = {
  organizationId: string;
  organizationName: string | null;
  subscriptionTier: string | null;
  enabledFeatureKeys: FeatureKey[];
};

export type AdminLicenseFeaturesPostRequest = {
  featureKey: FeatureKey;
  enabled: boolean;
};

export type AdminLicenseFeaturesPostResponse = {
  success: true;
  message: string;
};

export type AdminLicenseActivatePostRequest = {
  licenseKey: string;
};

export type AdminLicenseActivatePostResponse = {
  success: true;
  message: string;
  features: FeatureKey[];
};
