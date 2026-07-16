import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../..");
const schemaPath = join(repoRoot, "prisma/schema.prisma");
const migrationPath = join(
  repoRoot,
  "prisma/migrations/20260714160000_platform_commercial_catalog_schema_foundation_v1/migration.sql",
);

const schema = readFileSync(schemaPath, "utf8");
const migration = readFileSync(migrationPath, "utf8");

const REQUIRED_ENUMS = [
  "CatalogueVersionStatus",
  "BillingInterval",
  "EntitlementValueKind",
] as const;

const REQUIRED_MODELS = [
  "CommercialProduct",
  "Plan",
  "AddOn",
  "EntitlementDefinition",
  "CatalogueVersion",
  "PlanOffering",
  "AddOnOffering",
  "AddOnOfferingEligibility",
  "CataloguePrice",
  "PlanOfferingEntitlementGrant",
  "AddOnOfferingEntitlementGrant",
] as const;

const REQUIRED_TABLES = [
  "commercial_products",
  "commercial_plans",
  "commercial_add_ons",
  "entitlement_definitions",
  "catalogue_versions",
  "plan_offerings",
  "add_on_offerings",
  "add_on_offering_eligibilities",
  "catalogue_prices",
  "plan_offering_entitlement_grants",
  "add_on_offering_entitlement_grants",
] as const;

const FORBIDDEN_MODELS = [
  "ProviderCatalogueMapping",
  "CommercialCustomer",
  "TenantSubscription",
  "SubscriptionItem",
] as const;

const DESTRUCTIVE_SQL_PATTERN =
  /\b(DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM|INSERT INTO|CREATE POLICY|FORCE ROW LEVEL SECURITY|GRANT\s+.*\b(anon|authenticated)\b)\b/i;

const DML_UPDATE_PATTERN = /(^|;\s*)UPDATE\s+/im;

function stripSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
}

describe("platform commercial catalogue schema foundation", () => {
  it("defines required enums in Prisma schema", () => {
    for (const enumName of REQUIRED_ENUMS) {
      expect(schema).toMatch(new RegExp(`enum ${enumName}\\s*\\{`));
    }
  });

  it("defines required models and mapped tables", () => {
    for (const modelName of REQUIRED_MODELS) {
      expect(schema).toMatch(new RegExp(`model ${modelName}\\s*\\{`));
    }

    for (const tableName of REQUIRED_TABLES) {
      expect(migration).toContain(`CREATE TABLE "${tableName}"`);
    }
  });

  it("uses relational add-on eligibility (not array storage)", () => {
    expect(schema).toMatch(/model AddOnOfferingEligibility\s*\{/);
    expect(schema).not.toMatch(/eligiblePlanOfferingIds\s+String\[\]/);
    expect(migration).toContain('CREATE TABLE "add_on_offering_eligibilities"');
    expect(migration).toContain(
      "add_on_offering_eligibilities_planOfferingId_catalogueVersionId_fkey",
    );
  });

  it("stores catalogue prices as integer minor units with exactly-one target constraint", () => {
    expect(schema).toMatch(/amountMinor\s+Int/);
    expect(migration).toContain('"amountMinor" INTEGER NOT NULL');
    expect(migration).toContain("catalogue_prices_exactly_one_target_chk");
    expect(migration).toContain(
      "catalogue_prices_amount_minor_non_negative_chk",
    );
    expect(migration).toContain("catalogue_prices_currency_shape_chk");
  });

  it("references entitlement definitions by foreign key in grant models", () => {
    expect(schema).toMatch(
      /entitlementDefinitionId\s+String[\s\S]*EntitlementDefinition @relation/,
    );
    expect(migration).toContain(
      "plan_offering_entitlement_grants_entitlementDefinitionId_productId_fkey",
    );
    expect(migration).toContain(
      "add_on_offering_entitlement_grants_entitlementDefinitionId_productId_fkey",
    );
  });

  it("enforces database-level product scope via compound foreign keys", () => {
    expect(schema).toMatch(/model PlanOffering[\s\S]*?productId\s+String/);
    expect(schema).toMatch(/model AddOnOffering[\s\S]*?productId\s+String/);
    expect(schema).toMatch(
      /model PlanOfferingEntitlementGrant[\s\S]*?productId\s+String/,
    );
    expect(schema).toMatch(
      /model AddOnOfferingEntitlementGrant[\s\S]*?productId\s+String/,
    );

    expect(schema).toMatch(
      /fields: \[catalogueVersionId, productId\], references: \[id, productId\]/,
    );
    expect(schema).toMatch(
      /fields: \[planId, productId\], references: \[id, productId\]/,
    );
    expect(schema).toMatch(
      /fields: \[addOnId, productId\], references: \[id, productId\]/,
    );
    expect(schema).toMatch(
      /fields: \[planOfferingId, productId\], references: \[id, productId\]/,
    );
    expect(schema).toMatch(
      /fields: \[entitlementDefinitionId, productId\], references: \[id, productId\]/,
    );
    expect(schema).toMatch(
      /fields: \[addOnOfferingId, productId\], references: \[id, productId\]/,
    );

    const productScopedForeignKeys = [
      "plan_offerings_catalogueVersionId_productId_fkey",
      "plan_offerings_planId_productId_fkey",
      "add_on_offerings_catalogueVersionId_productId_fkey",
      "add_on_offerings_addOnId_productId_fkey",
      "plan_offering_entitlement_grants_planOfferingId_productId_fkey",
      "plan_offering_entitlement_grants_entitlementDefinitionId_productId_fkey",
      "add_on_offering_entitlement_grants_addOnOfferingId_productId_fkey",
      "add_on_offering_entitlement_grants_entitlementDefinitionId_productId_fkey",
    ] as const;

    for (const constraintName of productScopedForeignKeys) {
      expect(migration).toContain(constraintName);
    }

    const forbiddenSingleColumnScopeKeys = [
      'ADD CONSTRAINT "plan_offerings_catalogueVersionId_fkey"',
      'ADD CONSTRAINT "plan_offerings_planId_fkey"',
      'ADD CONSTRAINT "add_on_offerings_catalogueVersionId_fkey"',
      'ADD CONSTRAINT "add_on_offerings_addOnId_fkey"',
      'ADD CONSTRAINT "plan_offering_entitlement_grants_planOfferingId_fkey"',
      'ADD CONSTRAINT "plan_offering_entitlement_grants_entitlementDefinitionId_fkey"',
      'ADD CONSTRAINT "add_on_offering_entitlement_grants_addOnOfferingId_fkey"',
      'ADD CONSTRAINT "add_on_offering_entitlement_grants_entitlementDefinitionId_fkey"',
    ] as const;

    for (const forbiddenConstraint of forbiddenSingleColumnScopeKeys) {
      expect(migration).not.toContain(forbiddenConstraint);
    }
  });

  it("adds typed entitlement value constraints for plan and add-on grants", () => {
    expect(migration).toContain(
      "plan_offering_entitlement_grants_typed_value_chk",
    );
    expect(migration).toContain(
      "add_on_offering_entitlement_grants_typed_value_chk",
    );
  });

  it("enables Class-B RLS and revokes anon/authenticated on every new table", () => {
    for (const tableName of REQUIRED_TABLES) {
      expect(migration).toContain(
        `ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY`,
      );
      expect(migration).toContain(
        `REVOKE ALL ON TABLE "${tableName}" FROM anon, authenticated`,
      );
    }
  });

  it("excludes provider mapping and tenant subscription models", () => {
    for (const modelName of FORBIDDEN_MODELS) {
      expect(schema).not.toMatch(new RegExp(`model ${modelName}\\s*\\{`));
    }
  });

  it("contains no seed DML or destructive SQL in executable statements", () => {
    const executableSql = stripSqlComments(migration);
    expect(executableSql).not.toMatch(DESTRUCTIVE_SQL_PATTERN);
    expect(executableSql).not.toMatch(/\bINSERT INTO\b/i);
    expect(executableSql).not.toMatch(DML_UPDATE_PATTERN);
    expect(executableSql).not.toMatch(/\bDELETE FROM\b/i);
  });
});
