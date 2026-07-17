import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  DAT_COMMERCIAL_ENTITLEMENT_DEFINITIONS,
  DAT_COMMERCIAL_PLANS,
  DAT_COMMERCIAL_PRODUCT,
  DAT_INITIAL_CATALOGUE_DRAFT,
} from "@/lib/platform/commercial-catalog-seed-manifest";
import {
  formatCommercialCatalogSeedPreview,
  parseCommercialCatalogSeedArgs,
} from "@/lib/platform/commercial-catalog-seed-cli";
import {
  CatalogueVersionLifecycleConflictError,
  seedDatCommercialCatalogue,
  type SeedDatCommercialCatalogueClient,
} from "@/lib/platform/seed-dat-commercial-catalogue";
import { FEATURE_KEYS } from "@/lib/config/license-features";

type ProductRow = {
  id: string;
  productKey: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PlanRow = {
  id: string;
  productId: string;
  planKey: string;
  displayName: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type EntitlementRow = {
  id: string;
  productId: string;
  entitlementKey: string;
  displayName: string;
  description: string | null;
  defaultValueKind: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CatalogueRow = {
  id: string;
  productId: string;
  versionKey: string;
  status: string;
  displayName: string | null;
  notes: string | null;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  publishedAt: Date | null;
  retiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function cuid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function makeFakeCommercialCatalogueClient(): {
  client: SeedDatCommercialCatalogueClient;
  state: {
    products: Map<string, ProductRow>;
    plans: Map<string, PlanRow>;
    entitlements: Map<string, EntitlementRow>;
    catalogues: Map<string, CatalogueRow>;
  };
} {
  const products = new Map<string, ProductRow>();
  const plans = new Map<string, PlanRow>();
  const entitlements = new Map<string, EntitlementRow>();
  const catalogues = new Map<string, CatalogueRow>();

  const client = {
    commercialProduct: {
      upsert: async (args: {
        where: { productKey: string };
        create: ProductRow;
        update: Partial<ProductRow>;
      }) => {
        const key = args.where.productKey;
        const { create, update } = args;
        const existing = products.get(key);
        const now = new Date();
        if (!existing) {
          const row: ProductRow = {
            id: cuid("prod"),
            productKey: create.productKey,
            displayName: create.displayName,
            description: create.description ?? null,
            isActive: create.isActive ?? true,
            createdAt: now,
            updatedAt: now,
          };
          products.set(key, row);
          return row;
        }
        const next: ProductRow = {
          ...existing,
          displayName: (update.displayName as string) ?? existing.displayName,
          description:
            (update.description as string | null | undefined) ??
            existing.description,
          isActive: (update.isActive as boolean) ?? existing.isActive,
          updatedAt: new Date(now.getTime() + 1),
        };
        products.set(key, next);
        return next;
      },
    },
    plan: {
      upsert: async (args: {
        where: { productId_planKey: { productId: string; planKey: string } };
        create: PlanRow;
        update: Partial<PlanRow>;
      }) => {
        const { productId, planKey } = args.where.productId_planKey;
        const mapKey = `${productId}:${planKey}`;
        const { create, update } = args;
        const existing = plans.get(mapKey);
        const now = new Date();
        if (!existing) {
          const row: PlanRow = {
            id: cuid("plan"),
            productId: create.productId,
            planKey: create.planKey,
            displayName: create.displayName,
            description: create.description ?? null,
            sortOrder: create.sortOrder,
            isActive: create.isActive ?? true,
            createdAt: now,
            updatedAt: now,
          };
          plans.set(mapKey, row);
          return row;
        }
        const next: PlanRow = {
          ...existing,
          displayName: (update.displayName as string) ?? existing.displayName,
          description:
            (update.description as string | null | undefined) ??
            existing.description,
          sortOrder: (update.sortOrder as number) ?? existing.sortOrder,
          isActive: (update.isActive as boolean) ?? existing.isActive,
          updatedAt: new Date(now.getTime() + 1),
        };
        plans.set(mapKey, next);
        return next;
      },
    },
    entitlementDefinition: {
      upsert: async (args: {
        where: {
          productId_entitlementKey: {
            productId: string;
            entitlementKey: string;
          };
        };
        create: EntitlementRow;
        update: Partial<EntitlementRow>;
      }) => {
        const { productId, entitlementKey } =
          args.where.productId_entitlementKey;
        const mapKey = `${productId}:${entitlementKey}`;
        const { create, update } = args;
        const existing = entitlements.get(mapKey);
        const now = new Date();
        if (!existing) {
          const row: EntitlementRow = {
            id: cuid("ent"),
            productId: create.productId,
            entitlementKey: create.entitlementKey,
            displayName: create.displayName,
            description: create.description ?? null,
            defaultValueKind: create.defaultValueKind,
            isActive: create.isActive ?? true,
            createdAt: now,
            updatedAt: now,
          };
          entitlements.set(mapKey, row);
          return row;
        }
        const next: EntitlementRow = {
          ...existing,
          displayName: (update.displayName as string) ?? existing.displayName,
          description:
            (update.description as string | null | undefined) ??
            existing.description,
          defaultValueKind:
            (update.defaultValueKind as string) ?? existing.defaultValueKind,
          isActive: (update.isActive as boolean) ?? existing.isActive,
          updatedAt: new Date(now.getTime() + 1),
        };
        entitlements.set(mapKey, next);
        return next;
      },
    },
    catalogueVersion: {
      findUnique: async (args: {
        where: {
          productId_versionKey: { productId: string; versionKey: string };
        };
      }) => {
        const { productId, versionKey } = args.where.productId_versionKey;
        const mapKey = `${productId}:${versionKey}`;
        return catalogues.get(mapKey) ?? null;
      },
      create: async (args: {
        data: Omit<CatalogueRow, "id" | "createdAt" | "updatedAt">;
      }) => {
        const now = new Date();
        const row: CatalogueRow = {
          id: cuid("cat"),
          ...args.data,
          createdAt: now,
          updatedAt: now,
        };
        const mapKey = `${row.productId}:${row.versionKey}`;
        catalogues.set(mapKey, row);
        return row;
      },
      update: async (args: {
        where: { id: string };
        data: Partial<Pick<CatalogueRow, "displayName" | "notes">>;
      }) => {
        const existing = [...catalogues.values()].find(
          (c) => c.id === args.where.id,
        );
        if (!existing) throw new Error("catalogue not found");
        const now = new Date();
        const next: CatalogueRow = {
          ...existing,
          displayName:
            args.data.displayName !== undefined
              ? args.data.displayName
              : existing.displayName,
          notes:
            args.data.notes !== undefined ? args.data.notes : existing.notes,
          updatedAt: new Date(now.getTime() + 1),
        };
        catalogues.set(`${existing.productId}:${existing.versionKey}`, next);
        return next;
      },
    },
    $transaction: async <T>(
      fn: (tx: SeedDatCommercialCatalogueClient) => Promise<T>,
    ) => fn(client as unknown as SeedDatCommercialCatalogueClient),
  };

  return {
    client: client as unknown as SeedDatCommercialCatalogueClient,
    state: { products, plans, entitlements, catalogues },
  };
}

describe("commercial-catalog-seed-manifest", () => {
  it("defines exactly one product with key DAT", () => {
    expect(DAT_COMMERCIAL_PRODUCT.productKey).toBe("DAT");
    expect(DAT_COMMERCIAL_PRODUCT.isActive).toBe(true);
  });

  it("defines exactly DAT_CORE, DAT_PLUS, DAT_PREMIUM with deterministic display names and sort order", () => {
    expect(DAT_COMMERCIAL_PLANS.map((p) => p.planKey)).toEqual([
      "DAT_CORE",
      "DAT_PLUS",
      "DAT_PREMIUM",
    ]);
    expect(DAT_COMMERCIAL_PLANS.map((p) => p.displayName)).toEqual([
      "DAT Core",
      "DAT Plus",
      "DAT Premium",
    ]);
    expect(DAT_COMMERCIAL_PLANS.map((p) => p.sortOrder)).toEqual([10, 20, 30]);
  });

  it("defines initial DRAFT catalogue shell with no commercial rows beyond identity", () => {
    expect(DAT_INITIAL_CATALOGUE_DRAFT.versionKey).toBe("DAT_V1_INITIAL_DRAFT");
    expect(DAT_INITIAL_CATALOGUE_DRAFT.status).toBe("DRAFT");
    expect(DAT_INITIAL_CATALOGUE_DRAFT.effectiveFrom).toBeNull();
    expect(DAT_INITIAL_CATALOGUE_DRAFT.publishedAt).toBeNull();
    expect(DAT_COMMERCIAL_ENTITLEMENT_DEFINITIONS).toHaveLength(0);
  });

  it("does not seed entitlement keys that are not individually approved in the manifest", () => {
    const manifestKeys = DAT_COMMERCIAL_ENTITLEMENT_DEFINITIONS.map(
      (d) => d.entitlementKey,
    );
    for (const key of manifestKeys) {
      expect(FEATURE_KEYS.includes(key as (typeof FEATURE_KEYS)[number])).toBe(
        true,
      );
    }
  });
});

describe("seedDatCommercialCatalogue", () => {
  it("uses compound product-scoped identity boundaries on upsert", async () => {
    const { client } = makeFakeCommercialCatalogueClient();
    const upsertSpy = vi.spyOn(client.commercialProduct, "upsert");
    const planUpsertSpy = vi.spyOn(client.plan, "upsert");

    await seedDatCommercialCatalogue(client);

    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productKey: "DAT" },
      }),
    );
    const productId = upsertSpy.mock.results[0]?.value;
    const resolved = await productId;
    for (const planKey of ["DAT_CORE", "DAT_PLUS", "DAT_PREMIUM"]) {
      expect(planUpsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            productId_planKey: {
              productId: resolved.id,
              planKey,
            },
          },
        }),
      );
    }
  });

  it("is idempotent on a fake client (second run does not duplicate rows)", async () => {
    const { client, state } = makeFakeCommercialCatalogueClient();

    await seedDatCommercialCatalogue(client);
    const afterFirst = {
      products: state.products.size,
      plans: state.plans.size,
      catalogues: state.catalogues.size,
      entitlements: state.entitlements.size,
    };

    await seedDatCommercialCatalogue(client);
    expect(state.products.size).toBe(afterFirst.products);
    expect(state.plans.size).toBe(afterFirst.plans);
    expect(state.catalogues.size).toBe(afterFirst.catalogues);
    expect(state.entitlements.size).toBe(afterFirst.entitlements);
    expect(state.products.size).toBe(1);
    expect(state.plans.size).toBe(3);
    expect(state.catalogues.size).toBe(1);
  });

  it("refuses to downgrade a non-DRAFT catalogue version", async () => {
    const { client, state } = makeFakeCommercialCatalogueClient();
    const first = await seedDatCommercialCatalogue(client);
    const mapKey = `${first.product.id}:${DAT_INITIAL_CATALOGUE_DRAFT.versionKey}`;
    const row = state.catalogues.get(mapKey)!;
    state.catalogues.set(mapKey, { ...row, status: "PUBLISHED" });

    await expect(seedDatCommercialCatalogue(client)).rejects.toBeInstanceOf(
      CatalogueVersionLifecycleConflictError,
    );
    expect(state.catalogues.get(mapKey)?.status).toBe("PUBLISHED");
  });
});

describe("commercial catalogue seed CLI boundary", () => {
  const repoRoot = join(__dirname, "../..");
  const legacySeedSource = readFileSync(
    join(repoRoot, "scripts/seed.ts"),
    "utf8",
  );
  const commercialCliSource = readFileSync(
    join(repoRoot, "scripts/seed-commercial-catalog.ts"),
    "utf8",
  );
  const packageJson = JSON.parse(
    readFileSync(join(repoRoot, "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };
  const cliHelperSource = readFileSync(
    join(__dirname, "commercial-catalog-seed-cli.ts"),
    "utf8",
  );
  const manifestSource = readFileSync(
    join(__dirname, "commercial-catalog-seed-manifest.ts"),
    "utf8",
  );
  const seedServiceSource = readFileSync(
    join(__dirname, "seed-dat-commercial-catalogue.ts"),
    "utf8",
  );

  it("does not import or call seedDatCommercialCatalogue from legacy scripts/seed.ts", () => {
    expect(legacySeedSource).not.toContain("seedDatCommercialCatalogue");
    expect(legacySeedSource).not.toContain("seed-dat-commercial-catalogue");
    expect(legacySeedSource).not.toContain("commercial-catalog-seed");
  });

  it("points package script seed:commercial-catalog at the dedicated CLI", () => {
    expect(packageJson.scripts["seed:commercial-catalog"]).toBe(
      "tsx --require dotenv/config scripts/seed-commercial-catalog.ts",
    );
  });

  it("requires --apply before enabling writes (preview is the default)", () => {
    expect(parseCommercialCatalogSeedArgs([])).toEqual({
      apply: false,
      unknownFlags: [],
    });
    expect(parseCommercialCatalogSeedArgs(["--apply"])).toEqual({
      apply: true,
      unknownFlags: [],
    });
    expect(parseCommercialCatalogSeedArgs(["--", "--apply"])).toEqual({
      apply: true,
      unknownFlags: [],
    });
    expect(parseCommercialCatalogSeedArgs(["--apply", "--force"])).toEqual({
      apply: true,
      unknownFlags: ["--force"],
    });
    expect(parseCommercialCatalogSeedArgs(["--", "--force"])).toEqual({
      apply: false,
      unknownFlags: ["--force"],
    });
  });

  it("derives preview mode text from the pure manifest without Prisma", () => {
    const preview = formatCommercialCatalogSeedPreview();
    expect(preview).toContain("DAT commercial catalogue seed preview");
    expect(preview).toContain(`Product: ${DAT_COMMERCIAL_PRODUCT.productKey}`);
    expect(preview).toContain("Plans: DAT_CORE, DAT_PLUS, DAT_PREMIUM");
    expect(preview).toContain("Catalogue: DAT_V1_INITIAL_DRAFT (DRAFT)");
    expect(preview).toContain("Entitlement definitions: 0");
    expect(preview).toContain("Offerings: 0");
    expect(preview).toContain("No database connection was made.");
    expect(preview).toContain("Run with --apply");
    expect(cliHelperSource).not.toMatch(/new PrismaClient\s*\(/);
  });

  it("dedicated CLI does not import legacy seed and has no destructive operations", () => {
    expect(commercialCliSource).not.toContain("scripts/seed.ts");
    expect(commercialCliSource).not.toMatch(
      /from\s+["'].*\/seed["']|from\s+["']\.\/seed["']/,
    );
    expect(commercialCliSource).not.toMatch(
      /\b(deleteMany|truncate|DROP TABLE|reset)\b/i,
    );
    expect(commercialCliSource).toContain("--apply");
    expect(commercialCliSource).not.toMatch(
      /^import\s*\{[^}]*PrismaClient[^}]*\}\s*from\s*["']@prisma\/client["']/m,
    );
    expect(commercialCliSource).toMatch(
      /await import\(["']@prisma\/client["']\)/,
    );
    expect(commercialCliSource).toMatch(
      /if\s*\(\s*!apply\s*\)\s*\{[\s\S]*?return;[\s\S]*?await applyCommercialCatalogueSeed\s*\(/,
    );
  });

  it("does not instantiate PrismaClient in pure manifest, service, or CLI helper source", () => {
    expect(manifestSource).not.toMatch(/new PrismaClient\s*\(/);
    expect(seedServiceSource).not.toMatch(/new PrismaClient\s*\(/);
    expect(cliHelperSource).not.toMatch(/new PrismaClient\s*\(/);
    expect(seedServiceSource).toMatch(
      /import type \{[^}]+\} from "@prisma\/client"/,
    );
  });
});
