import type { CatalogueVersionStatus, PrismaClient } from "@prisma/client";

import {
  DAT_COMMERCIAL_ENTITLEMENT_DEFINITIONS,
  DAT_COMMERCIAL_PLANS,
  DAT_COMMERCIAL_PRODUCT,
  DAT_INITIAL_CATALOGUE_DRAFT,
} from "@/lib/platform/commercial-catalog-seed-manifest";

export class CatalogueVersionLifecycleConflictError extends Error {
  readonly versionKey: string;
  readonly currentStatus: CatalogueVersionStatus;

  constructor(versionKey: string, currentStatus: CatalogueVersionStatus) {
    super(
      `Catalogue version "${versionKey}" already exists with status ${currentStatus}. ` +
        "Refusing to mutate a non-DRAFT catalogue. Create a new versionKey or reconcile manually.",
    );
    this.name = "CatalogueVersionLifecycleConflictError";
    this.versionKey = versionKey;
    this.currentStatus = currentStatus;
  }
}

type CommercialProductUpsertClient = Pick<
  PrismaClient["commercialProduct"],
  "upsert"
>;

type PlanUpsertClient = Pick<PrismaClient["plan"], "upsert">;

type EntitlementDefinitionUpsertClient = Pick<
  PrismaClient["entitlementDefinition"],
  "upsert"
>;

type CatalogueVersionReadWriteClient = Pick<
  PrismaClient["catalogueVersion"],
  "findUnique" | "create" | "update"
>;

export type SeedDatCommercialCatalogueClient = {
  commercialProduct: CommercialProductUpsertClient;
  plan: PlanUpsertClient;
  entitlementDefinition: EntitlementDefinitionUpsertClient;
  catalogueVersion: CatalogueVersionReadWriteClient;
  $transaction?: <T>(
    fn: (tx: SeedDatCommercialCatalogueClient) => Promise<T>,
  ) => Promise<T>;
};

export type SeedDatCommercialCatalogueSummary = {
  product: {
    productKey: string;
    id: string;
    action: "created" | "updated";
  };
  plans: Array<{
    planKey: string;
    id: string;
    action: "created" | "updated";
  }>;
  entitlementDefinitions: Array<{
    entitlementKey: string;
    id: string;
    action: "created" | "updated";
  }>;
  catalogueVersion: {
    versionKey: string;
    id: string;
    status: CatalogueVersionStatus;
    action: "created" | "updated" | "unchanged";
  };
};

async function seedDatCommercialCatalogueInClient(
  client: SeedDatCommercialCatalogueClient,
): Promise<SeedDatCommercialCatalogueSummary> {
  const productUpsert = await client.commercialProduct.upsert({
    where: { productKey: DAT_COMMERCIAL_PRODUCT.productKey },
    create: {
      productKey: DAT_COMMERCIAL_PRODUCT.productKey,
      displayName: DAT_COMMERCIAL_PRODUCT.displayName,
      description: DAT_COMMERCIAL_PRODUCT.description,
      isActive: DAT_COMMERCIAL_PRODUCT.isActive,
    },
    update: {
      displayName: DAT_COMMERCIAL_PRODUCT.displayName,
      description: DAT_COMMERCIAL_PRODUCT.description,
      isActive: DAT_COMMERCIAL_PRODUCT.isActive,
    },
  });

  const productAction =
    productUpsert.createdAt.getTime() === productUpsert.updatedAt.getTime()
      ? ("created" as const)
      : ("updated" as const);

  const planSummaries: SeedDatCommercialCatalogueSummary["plans"] = [];
  for (const planSeed of DAT_COMMERCIAL_PLANS) {
    const plan = await client.plan.upsert({
      where: {
        productId_planKey: {
          productId: productUpsert.id,
          planKey: planSeed.planKey,
        },
      },
      create: {
        productId: productUpsert.id,
        planKey: planSeed.planKey,
        displayName: planSeed.displayName,
        description: planSeed.description,
        sortOrder: planSeed.sortOrder,
        isActive: planSeed.isActive,
      },
      update: {
        displayName: planSeed.displayName,
        description: planSeed.description,
        sortOrder: planSeed.sortOrder,
        isActive: planSeed.isActive,
      },
    });
    const action =
      plan.createdAt.getTime() === plan.updatedAt.getTime()
        ? ("created" as const)
        : ("updated" as const);
    planSummaries.push({ planKey: plan.planKey, id: plan.id, action });
  }

  const entitlementSummaries: SeedDatCommercialCatalogueSummary["entitlementDefinitions"] =
    [];
  for (const defSeed of DAT_COMMERCIAL_ENTITLEMENT_DEFINITIONS) {
    const def = await client.entitlementDefinition.upsert({
      where: {
        productId_entitlementKey: {
          productId: productUpsert.id,
          entitlementKey: defSeed.entitlementKey,
        },
      },
      create: {
        productId: productUpsert.id,
        entitlementKey: defSeed.entitlementKey,
        displayName: defSeed.displayName,
        description: defSeed.description,
        defaultValueKind: defSeed.defaultValueKind,
        isActive: defSeed.isActive,
      },
      update: {
        displayName: defSeed.displayName,
        description: defSeed.description,
        defaultValueKind: defSeed.defaultValueKind,
        isActive: defSeed.isActive,
      },
    });
    const action =
      def.createdAt.getTime() === def.updatedAt.getTime()
        ? ("created" as const)
        : ("updated" as const);
    entitlementSummaries.push({
      entitlementKey: def.entitlementKey,
      id: def.id,
      action,
    });
  }

  const catalogueSeed = DAT_INITIAL_CATALOGUE_DRAFT;
  const existingCatalogue = await client.catalogueVersion.findUnique({
    where: {
      productId_versionKey: {
        productId: productUpsert.id,
        versionKey: catalogueSeed.versionKey,
      },
    },
  });

  let catalogueVersion: {
    id: string;
    versionKey: string;
    status: CatalogueVersionStatus;
    createdAt: Date;
    updatedAt: Date;
  };
  let catalogueAction: SeedDatCommercialCatalogueSummary["catalogueVersion"]["action"];

  if (!existingCatalogue) {
    catalogueVersion = await client.catalogueVersion.create({
      data: {
        productId: productUpsert.id,
        versionKey: catalogueSeed.versionKey,
        status: catalogueSeed.status,
        displayName: catalogueSeed.displayName,
        notes: catalogueSeed.notes,
        effectiveFrom: catalogueSeed.effectiveFrom,
        effectiveTo: catalogueSeed.effectiveTo,
        publishedAt: catalogueSeed.publishedAt,
        retiredAt: catalogueSeed.retiredAt,
      },
    });
    catalogueAction = "created";
  } else if (existingCatalogue.status === "DRAFT") {
    const before = existingCatalogue.updatedAt.getTime();
    catalogueVersion = await client.catalogueVersion.update({
      where: { id: existingCatalogue.id },
      data: {
        displayName: catalogueSeed.displayName,
        notes: catalogueSeed.notes,
      },
    });
    catalogueAction =
      catalogueVersion.updatedAt.getTime() > before ? "updated" : "unchanged";
  } else {
    throw new CatalogueVersionLifecycleConflictError(
      catalogueSeed.versionKey,
      existingCatalogue.status,
    );
  }

  return {
    product: {
      productKey: productUpsert.productKey,
      id: productUpsert.id,
      action: productAction,
    },
    plans: planSummaries,
    entitlementDefinitions: entitlementSummaries,
    catalogueVersion: {
      versionKey: catalogueVersion.versionKey,
      id: catalogueVersion.id,
      status: catalogueVersion.status,
      action: catalogueAction,
    },
  };
}

/**
 * Idempotent DAT commercial catalogue identity seed (product, plans, optional entitlement defs, DRAFT shell).
 * Does not create offerings, prices, grants, add-ons, or subscriptions.
 */
export async function seedDatCommercialCatalogue(
  prisma: SeedDatCommercialCatalogueClient,
): Promise<SeedDatCommercialCatalogueSummary> {
  const run = (client: SeedDatCommercialCatalogueClient) =>
    seedDatCommercialCatalogueInClient(client);

  if (prisma.$transaction) {
    return prisma.$transaction((tx) => run(tx));
  }
  return run(prisma);
}
