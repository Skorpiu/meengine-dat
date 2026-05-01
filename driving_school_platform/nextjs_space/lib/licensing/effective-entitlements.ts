import { db } from "@/lib/db";
import type { FeatureKey } from "@/lib/config/license-features";

export type EffectiveEntitlementSource =
  | "organization_feature"
  | "entitlement_grant";

export type EffectiveEntitlement = {
  featureKey: string;
  enabled: true;
  source: EffectiveEntitlementSource;
  expiresAt: Date | null;
};

export type EntitlementGrantInput = {
  featureKey: string;
  startsAt: Date;
  expiresAt: Date | null;
};

export function resolveEffectiveEntitlements(input: {
  now: Date;
  manualEnabledFeatureKeys: string[];
  grants: EntitlementGrantInput[];
}): EffectiveEntitlement[] {
  const byKey = new Map<string, EffectiveEntitlement>();

  for (const featureKey of input.manualEnabledFeatureKeys) {
    if (!featureKey) continue;
    byKey.set(featureKey, {
      featureKey,
      enabled: true,
      source: "organization_feature",
      expiresAt: null,
    });
  }

  const grantExpiryByKey = new Map<string, Date | null>();
  for (const g of input.grants) {
    if (!g.featureKey) continue;
    if (g.startsAt > input.now) continue;
    if (g.expiresAt != null && g.expiresAt <= input.now) continue;

    const prev = grantExpiryByKey.get(g.featureKey);
    if (prev === undefined) {
      grantExpiryByKey.set(g.featureKey, g.expiresAt ?? null);
      continue;
    }
    if (prev === null || g.expiresAt == null) {
      grantExpiryByKey.set(g.featureKey, null);
      continue;
    }
    grantExpiryByKey.set(g.featureKey, g.expiresAt < prev ? g.expiresAt : prev);
  }

  for (const [featureKey, expiresAt] of grantExpiryByKey.entries()) {
    if (byKey.has(featureKey)) continue; // manual is strongest + non-expiring
    byKey.set(featureKey, {
      featureKey,
      enabled: true,
      source: "entitlement_grant",
      expiresAt,
    });
  }

  return Array.from(byKey.values());
}

export async function getEffectiveEntitlementsForOrganization(
  organizationId: string,
  opts?: { now?: Date },
): Promise<EffectiveEntitlement[]> {
  const now = opts?.now ?? new Date();

  const manual = await db.organizationFeature.findMany({
    where: {
      organizationId,
      isEnabled: true,
    },
    select: {
      featureKey: true,
    },
  });

  const grants = await db.entitlementGrant.findMany({
    where: {
      organizationId,
      startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: {
      featureKey: true,
      startsAt: true,
      expiresAt: true,
    },
  });

  return resolveEffectiveEntitlements({
    now,
    manualEnabledFeatureKeys: manual.map(
      (f: { featureKey: string }) => f.featureKey,
    ),
    grants: grants.map(
      (g: { featureKey: string; startsAt: Date; expiresAt: Date | null }) => ({
        featureKey: g.featureKey,
        startsAt: g.startsAt,
        expiresAt: g.expiresAt ?? null,
      }),
    ),
  });
}

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
  const entitlements =
    await getEffectiveEntitlementsForOrganization(organizationId);
  return entitlements.map((e) => e.featureKey);
}

export async function isFeatureEnabledForOrganization(
  organizationId: string,
  featureKey: FeatureKey,
): Promise<boolean> {
  const entitlements =
    await getEffectiveEntitlementsForOrganization(organizationId);
  return entitlements.some((e) => e.featureKey === featureKey);
}
