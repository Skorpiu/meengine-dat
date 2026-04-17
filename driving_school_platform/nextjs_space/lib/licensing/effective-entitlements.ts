import { db } from "@/lib/db";
import type { FeatureKey } from "@/lib/config/license-features";

/**
 * Canonical resolver for "effective entitlements".
 *
 * Note: this preserves the current data model semantics:
 * - Source of truth is `OrganizationFeature.isEnabled`.
 * - Returned keys are the raw DB values (validation/filtering happens at API boundaries).
 */
export async function getEnabledFeatureKeysForOrganization(
  organizationId: string,
): Promise<string[]> {
  const features = await db.organizationFeature.findMany({
    where: {
      organizationId,
      isEnabled: true,
    },
    select: {
      featureKey: true,
    },
  });

  return features.map((f: { featureKey: string }) => f.featureKey);
}

export async function isFeatureEnabledForOrganization(
  organizationId: string,
  featureKey: FeatureKey,
): Promise<boolean> {
  const feature = await db.organizationFeature.findUnique({
    where: {
      organizationId_featureKey: {
        organizationId,
        featureKey,
      },
    },
  });

  return feature?.isEnabled ?? false;
}
