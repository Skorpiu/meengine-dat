import type {
  CatalogueVersionStatus,
  EntitlementValueKind,
} from "@prisma/client";

/** Immutable seed identity for {@link CommercialProduct}. */
export type CommercialProductSeed = {
  productKey: string;
  displayName: string;
  description: string;
  isActive: true;
};

/** Immutable seed identity for {@link Plan}. */
export type PlanSeed = {
  planKey: string;
  displayName: string;
  description: string;
  sortOrder: number;
  isActive: true;
};

/** Immutable seed identity for {@link EntitlementDefinition}. */
export type EntitlementDefinitionSeed = {
  entitlementKey: string;
  displayName: string;
  description: string;
  defaultValueKind: EntitlementValueKind;
  isActive: true;
};

/** Immutable seed shell for a DRAFT {@link CatalogueVersion} (no offerings/prices). */
export type CatalogueVersionDraftSeed = {
  versionKey: string;
  status: Extract<CatalogueVersionStatus, "DRAFT">;
  displayName: string;
  notes: string;
  effectiveFrom: null;
  effectiveTo: null;
  publishedAt: null;
  retiredAt: null;
};

export const DAT_COMMERCIAL_PRODUCT: CommercialProductSeed = {
  productKey: "DAT",
  displayName: "Driving Academy Tool",
  description:
    "Driving-school operations product for schools and instructors, managed and sold through the MeEngine Platform.",
  isActive: true,
};

export const DAT_COMMERCIAL_PLANS: readonly PlanSeed[] = [
  {
    planKey: "DAT_CORE",
    displayName: "DAT Core",
    description:
      "Complete operational foundation to run a driving school with DAT — not a trial or crippled edition.",
    sortOrder: 10,
    isActive: true,
  },
  {
    planKey: "DAT_PLUS",
    displayName: "DAT Plus",
    description:
      "Automation, operational control, and administrative efficiency beyond DAT Core.",
    sortOrder: 20,
    isActive: true,
  },
  {
    planKey: "DAT_PREMIUM",
    displayName: "DAT Premium",
    description:
      "Most complete DAT tier with higher-value capabilities; contents are defined by versioned entitlements, not every future capability.",
    sortOrder: 30,
    isActive: true,
  },
] as const;

export const DAT_INITIAL_CATALOGUE_DRAFT: CatalogueVersionDraftSeed = {
  versionKey: "DAT_V1_INITIAL_DRAFT",
  status: "DRAFT",
  displayName: "DAT v1 Initial Draft",
  notes:
    "Bootstrap catalogue shell only. No approved plan offerings, add-on offerings, prices, or plan/add-on entitlement composition. Commercial composition and pricing remain open.",
  effectiveFrom: null,
  effectiveTo: null,
  publishedAt: null,
  retiredAt: null,
};

/**
 * Approved entitlement definitions for the bootstrap seed (may be empty).
 *
 * Inventory (candidates not seeded in this slice):
 * - Legacy `FeatureKey` values in `lib/config/license-features.ts` — runtime compatibility layer;
 *   commercial catalogue → tenant bridge and module alignment are deferred (see product module catalog).
 * - Proposed module intent keys in `docs/product/dat-plan-and-module-catalog.md` (e.g.
 *   `CORE_OPERATIONS`, `IMPORT_EXPORT_SELF_SERVICE`, `LESSON_REMINDERS_EMAIL`) — not exact runtime keys;
 *   plan composition remains open (OD-007/008).
 * - Deferred placeholders (`SMS_NOTIFICATIONS`, `MOBILE_APP`, `MULTI_LANGUAGE` until real product/i18n).
 *
 * Seeding zero definitions is deliberate: identities and DRAFT shell only; grants and plan composition are later slices.
 */
export const DAT_COMMERCIAL_ENTITLEMENT_DEFINITIONS: readonly EntitlementDefinitionSeed[] =
  [];
