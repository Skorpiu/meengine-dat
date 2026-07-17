/**
 * Dedicated non-destructive DAT commercial catalogue identity seed.
 *
 * Reconciles only:
 *   - product DAT
 *   - plans DAT_CORE, DAT_PLUS, DAT_PREMIUM
 *   - DRAFT shell DAT_V1_INITIAL_DRAFT
 *
 * Does not: deploy migrations, publish catalogues, create offerings/prices/grants/add-ons/subscriptions,
 * or run the legacy development/demo `prisma db seed` entrypoint.
 *
 * Preview (no DB / no Prisma):
 *   pnpm seed:commercial-catalog
 *
 * Explicit write:
 *   pnpm seed:commercial-catalog -- --apply
 *
 * Prerequisites: commercial catalogue schema migration already deployed on the target database.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  formatCommercialCatalogSeedApplySummary,
  formatCommercialCatalogSeedPreview,
  parseCommercialCatalogSeedArgs,
} from "@/lib/platform/commercial-catalog-seed-cli";

export function isCommercialCatalogSeedDirectExecution(
  argv1: string | undefined,
  moduleUrl: string,
): boolean {
  if (!argv1) return false;
  try {
    const entryHref = pathToFileURL(path.resolve(argv1)).href;
    return entryHref === moduleUrl;
  } catch {
    return false;
  }
}

async function applyCommercialCatalogueSeed(): Promise<void> {
  const { PrismaClient } = await import("@prisma/client");
  const { seedDatCommercialCatalogue } = await import(
    "@/lib/platform/seed-dat-commercial-catalogue"
  );

  const prisma = new PrismaClient();
  try {
    const summary = await seedDatCommercialCatalogue({
      commercialProduct: prisma.commercialProduct,
      plan: prisma.plan,
      entitlementDefinition: prisma.entitlementDefinition,
      catalogueVersion: prisma.catalogueVersion,
      $transaction: (fn) =>
        prisma.$transaction((tx) =>
          fn({
            commercialProduct: tx.commercialProduct,
            plan: tx.plan,
            entitlementDefinition: tx.entitlementDefinition,
            catalogueVersion: tx.catalogueVersion,
          }),
        ),
    });
    console.log(formatCommercialCatalogSeedApplySummary(summary));
  } finally {
    await prisma.$disconnect();
  }
}

export async function runCommercialCatalogSeedCli(
  argv: readonly string[],
): Promise<void> {
  const { apply, unknownFlags } = parseCommercialCatalogSeedArgs(argv);

  if (unknownFlags.length > 0) {
    console.error(
      `Unknown flag(s): ${unknownFlags.join(", ")}. Supported: --apply`,
    );
    process.exitCode = 1;
    return;
  }

  if (!apply) {
    console.log(formatCommercialCatalogSeedPreview());
    return;
  }

  await applyCommercialCatalogueSeed();
}

async function main(): Promise<void> {
  try {
    await runCommercialCatalogSeedCli(process.argv.slice(2));
  } catch (error) {
    console.error("❌ Commercial catalogue seed failed:", error);
    process.exitCode = 1;
  }
}

if (isCommercialCatalogSeedDirectExecution(process.argv[1], import.meta.url)) {
  void main();
}
