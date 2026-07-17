import {
  DAT_COMMERCIAL_ENTITLEMENT_DEFINITIONS,
  DAT_COMMERCIAL_PLANS,
  DAT_COMMERCIAL_PRODUCT,
  DAT_INITIAL_CATALOGUE_DRAFT,
} from "@/lib/platform/commercial-catalog-seed-manifest";
import type { SeedDatCommercialCatalogueSummary } from "@/lib/platform/seed-dat-commercial-catalogue";

export type CommercialCatalogSeedCliArgs = {
  apply: boolean;
  unknownFlags: string[];
};

/**
 * Dependency-free argv parser for the commercial catalogue seed CLI.
 * Only `--apply` enables database writes; all other flags are reported as unknown.
 */
export function parseCommercialCatalogSeedArgs(
  argv: readonly string[],
): CommercialCatalogSeedCliArgs {
  let apply = false;
  const unknownFlags: string[] = [];

  for (const arg of argv) {
    if (arg === "--") {
      continue;
    }
    if (arg === "--apply") {
      apply = true;
      continue;
    }
    if (arg.startsWith("-")) {
      unknownFlags.push(arg);
    }
  }

  return { apply, unknownFlags };
}

export function formatCommercialCatalogSeedPreview(): string {
  const planKeys = DAT_COMMERCIAL_PLANS.map((p) => p.planKey).join(", ");
  const entitlementCount = DAT_COMMERCIAL_ENTITLEMENT_DEFINITIONS.length;

  return [
    "DAT commercial catalogue seed preview",
    "",
    "Safety notes:",
    "- Schema migration must already be deployed (this command does not migrate).",
    "- This command does not publish the DRAFT catalogue.",
    "- Not the same as `prisma db seed` (legacy development/demo seed is separate).",
    "",
    `Product: ${DAT_COMMERCIAL_PRODUCT.productKey}`,
    `Plans: ${planKeys}`,
    `Catalogue: ${DAT_INITIAL_CATALOGUE_DRAFT.versionKey} (${DAT_INITIAL_CATALOGUE_DRAFT.status})`,
    `Entitlement definitions: ${entitlementCount}`,
    "Offerings: 0",
    "Prices: 0",
    "Grants: 0",
    "Add-ons: 0",
    "Subscriptions: 0",
    "",
    "No database connection was made.",
    "Run with --apply to reconcile these identities.",
  ].join("\n");
}

export function formatCommercialCatalogSeedApplySummary(
  summary: SeedDatCommercialCatalogueSummary,
): string {
  const planLine = summary.plans
    .map((p) => `${p.planKey} (${p.action})`)
    .join(", ");

  return [
    "DAT commercial catalogue seed applied",
    "",
    "Safety notes:",
    "- Schema migration must already be deployed (this command does not migrate).",
    "- This command does not publish the DRAFT catalogue.",
    "- Not the same as `prisma db seed` (legacy development/demo seed is separate).",
    "",
    `Product: ${summary.product.productKey} (${summary.product.action})`,
    `Plans: ${planLine}`,
    `Catalogue: ${summary.catalogueVersion.versionKey} (${summary.catalogueVersion.status}, ${summary.catalogueVersion.action})`,
    `Entitlement definitions: ${summary.entitlementDefinitions.length}`,
    "Offerings: 0",
    "Prices: 0",
    "Grants: 0",
    "Add-ons: 0",
    "Subscriptions: 0",
  ].join("\n");
}
