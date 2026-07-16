/*
  Platform commercial catalogue schema foundation (v1) — additive only.

  - Additive enums and tables for Platform-owned, provider-neutral commercial catalogue.
  - No commercial seed data; no provider mappings; no subscription domain.
  - Backend/Prisma owner connection remains the server access path.
  - Publication immutability for PUBLISHED+ catalogue rows is NOT enforced here;
    DRAFT rows are editable; future write-service boundary owns lifecycle rules.
  - Class-B hardening: RLS enabled + REVOKE ALL FROM anon, authenticated on every new table.
  - Product scope enforced via compound foreign keys (offerings/grants cannot reference another product).
  - No CREATE POLICY; no FORCE ROW LEVEL SECURITY; no GRANT to anon/authenticated.
*/

-- CreateEnum
CREATE TYPE "CatalogueVersionStatus" AS ENUM (
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'RETIRED',
  'ARCHIVED'
);

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "EntitlementValueKind" AS ENUM (
  'BOOLEAN',
  'INTEGER_LIMIT',
  'STRING_POLICY',
  'JSON_CONFIG'
);

-- CreateTable
CREATE TABLE "commercial_products" (
  "id" TEXT NOT NULL,
  "productKey" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "commercial_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commercial_plans" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "planKey" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "commercial_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commercial_add_ons" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "addOnKey" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "commercial_add_ons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlement_definitions" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "entitlementKey" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "defaultValueKind" "EntitlementValueKind" NOT NULL DEFAULT 'BOOLEAN',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "entitlement_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogue_versions" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "versionKey" TEXT NOT NULL,
  "status" "CatalogueVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "displayName" TEXT,
  "notes" TEXT,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "retiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "catalogue_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "catalogue_versions_effective_date_order_chk" CHECK (
    "effectiveTo" IS NULL
    OR "effectiveFrom" IS NULL
    OR "effectiveTo" > "effectiveFrom"
  )
);

-- CreateTable
CREATE TABLE "plan_offerings" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "catalogueVersionId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "compositionHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "plan_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "add_on_offerings" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "catalogueVersionId" TEXT NOT NULL,
  "addOnId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "add_on_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "add_on_offering_eligibilities" (
  "catalogueVersionId" TEXT NOT NULL,
  "addOnOfferingId" TEXT NOT NULL,
  "planOfferingId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "add_on_offering_eligibilities_pkey" PRIMARY KEY ("addOnOfferingId", "planOfferingId")
);

-- CreateTable
CREATE TABLE "catalogue_prices" (
  "id" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "interval" "BillingInterval" NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "taxTreatment" TEXT,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3),
  "planOfferingId" TEXT,
  "addOnOfferingId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "catalogue_prices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "catalogue_prices_amount_minor_non_negative_chk" CHECK ("amountMinor" >= 0),
  CONSTRAINT "catalogue_prices_currency_shape_chk" CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "catalogue_prices_exactly_one_target_chk" CHECK (
    ("planOfferingId" IS NOT NULL AND "addOnOfferingId" IS NULL)
    OR ("planOfferingId" IS NULL AND "addOnOfferingId" IS NOT NULL)
  ),
  CONSTRAINT "catalogue_prices_effective_date_order_chk" CHECK (
    "effectiveTo" IS NULL
    OR "effectiveFrom" IS NULL
    OR "effectiveTo" > "effectiveFrom"
  )
);

-- CreateTable
CREATE TABLE "plan_offering_entitlement_grants" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "planOfferingId" TEXT NOT NULL,
  "entitlementDefinitionId" TEXT NOT NULL,
  "valueKind" "EntitlementValueKind" NOT NULL,
  "valueBoolean" BOOLEAN,
  "valueInteger" INTEGER,
  "valueString" TEXT,
  "valueJson" JSONB,

  CONSTRAINT "plan_offering_entitlement_grants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "plan_offering_entitlement_grants_typed_value_chk" CHECK (
    (
      "valueKind" = 'BOOLEAN'
      AND "valueBoolean" IS NOT NULL
      AND "valueInteger" IS NULL
      AND "valueString" IS NULL
      AND "valueJson" IS NULL
    )
    OR (
      "valueKind" = 'INTEGER_LIMIT'
      AND "valueInteger" IS NOT NULL
      AND "valueInteger" >= 0
      AND "valueBoolean" IS NULL
      AND "valueString" IS NULL
      AND "valueJson" IS NULL
    )
    OR (
      "valueKind" = 'STRING_POLICY'
      AND "valueString" IS NOT NULL
      AND "valueBoolean" IS NULL
      AND "valueInteger" IS NULL
      AND "valueJson" IS NULL
    )
    OR (
      "valueKind" = 'JSON_CONFIG'
      AND "valueJson" IS NOT NULL
      AND "valueBoolean" IS NULL
      AND "valueInteger" IS NULL
      AND "valueString" IS NULL
    )
  )
);

-- CreateTable
CREATE TABLE "add_on_offering_entitlement_grants" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "addOnOfferingId" TEXT NOT NULL,
  "entitlementDefinitionId" TEXT NOT NULL,
  "valueKind" "EntitlementValueKind" NOT NULL,
  "valueBoolean" BOOLEAN,
  "valueInteger" INTEGER,
  "valueString" TEXT,
  "valueJson" JSONB,

  CONSTRAINT "add_on_offering_entitlement_grants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "add_on_offering_entitlement_grants_typed_value_chk" CHECK (
    (
      "valueKind" = 'BOOLEAN'
      AND "valueBoolean" IS NOT NULL
      AND "valueInteger" IS NULL
      AND "valueString" IS NULL
      AND "valueJson" IS NULL
    )
    OR (
      "valueKind" = 'INTEGER_LIMIT'
      AND "valueInteger" IS NOT NULL
      AND "valueInteger" >= 0
      AND "valueBoolean" IS NULL
      AND "valueString" IS NULL
      AND "valueJson" IS NULL
    )
    OR (
      "valueKind" = 'STRING_POLICY'
      AND "valueString" IS NOT NULL
      AND "valueBoolean" IS NULL
      AND "valueInteger" IS NULL
      AND "valueJson" IS NULL
    )
    OR (
      "valueKind" = 'JSON_CONFIG'
      AND "valueJson" IS NOT NULL
      AND "valueBoolean" IS NULL
      AND "valueInteger" IS NULL
      AND "valueString" IS NULL
    )
  )
);

-- CreateIndex
CREATE UNIQUE INDEX "commercial_products_productKey_key" ON "commercial_products"("productKey");

-- CreateIndex
CREATE INDEX "commercial_plans_productId_idx" ON "commercial_plans"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "commercial_plans_productId_planKey_key" ON "commercial_plans"("productId", "planKey");

-- Composite unique index supports product-scoped offering/grant composite FKs.
CREATE UNIQUE INDEX "commercial_plans_id_productId_key" ON "commercial_plans"("id", "productId");

-- CreateIndex
CREATE INDEX "commercial_add_ons_productId_idx" ON "commercial_add_ons"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "commercial_add_ons_productId_addOnKey_key" ON "commercial_add_ons"("productId", "addOnKey");

-- Composite unique index supports product-scoped offering/grant composite FKs.
CREATE UNIQUE INDEX "commercial_add_ons_id_productId_key" ON "commercial_add_ons"("id", "productId");

-- CreateIndex
CREATE INDEX "entitlement_definitions_productId_idx" ON "entitlement_definitions"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "entitlement_definitions_productId_entitlementKey_key" ON "entitlement_definitions"("productId", "entitlementKey");

-- Composite unique index supports product-scoped grant composite FKs.
CREATE UNIQUE INDEX "entitlement_definitions_id_productId_key" ON "entitlement_definitions"("id", "productId");

-- CreateIndex
CREATE INDEX "catalogue_versions_productId_status_idx" ON "catalogue_versions"("productId", "status");

-- CreateIndex
CREATE INDEX "catalogue_versions_productId_effectiveFrom_idx" ON "catalogue_versions"("productId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "catalogue_versions_productId_versionKey_key" ON "catalogue_versions"("productId", "versionKey");

-- Composite unique index supports product-scoped offering composite FKs.
CREATE UNIQUE INDEX "catalogue_versions_id_productId_key" ON "catalogue_versions"("id", "productId");

-- CreateIndex
CREATE INDEX "plan_offerings_productId_idx" ON "plan_offerings"("productId");

-- CreateIndex
CREATE INDEX "plan_offerings_catalogueVersionId_idx" ON "plan_offerings"("catalogueVersionId");

-- CreateIndex
CREATE INDEX "plan_offerings_planId_idx" ON "plan_offerings"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_offerings_catalogueVersionId_planId_key" ON "plan_offerings"("catalogueVersionId", "planId");

-- Composite unique index supports cross-catalogue-safe eligibility composite FKs.
CREATE UNIQUE INDEX "plan_offerings_id_catalogueVersionId_key" ON "plan_offerings"("id", "catalogueVersionId");

-- Composite unique index supports product-scoped grant composite FKs.
CREATE UNIQUE INDEX "plan_offerings_id_productId_key" ON "plan_offerings"("id", "productId");

-- CreateIndex
CREATE INDEX "add_on_offerings_productId_idx" ON "add_on_offerings"("productId");

-- CreateIndex
CREATE INDEX "add_on_offerings_catalogueVersionId_idx" ON "add_on_offerings"("catalogueVersionId");

-- CreateIndex
CREATE INDEX "add_on_offerings_addOnId_idx" ON "add_on_offerings"("addOnId");

-- CreateIndex
CREATE UNIQUE INDEX "add_on_offerings_catalogueVersionId_addOnId_key" ON "add_on_offerings"("catalogueVersionId", "addOnId");

-- Composite unique index supports cross-catalogue-safe eligibility composite FKs.
CREATE UNIQUE INDEX "add_on_offerings_id_catalogueVersionId_key" ON "add_on_offerings"("id", "catalogueVersionId");

-- Composite unique index supports product-scoped grant composite FKs.
CREATE UNIQUE INDEX "add_on_offerings_id_productId_key" ON "add_on_offerings"("id", "productId");

-- CreateIndex
CREATE INDEX "add_on_offering_eligibilities_catalogueVersionId_idx" ON "add_on_offering_eligibilities"("catalogueVersionId");

-- CreateIndex
CREATE INDEX "add_on_offering_eligibilities_planOfferingId_idx" ON "add_on_offering_eligibilities"("planOfferingId");

-- CreateIndex
CREATE INDEX "catalogue_prices_planOfferingId_interval_idx" ON "catalogue_prices"("planOfferingId", "interval");

-- CreateIndex
CREATE INDEX "catalogue_prices_addOnOfferingId_interval_idx" ON "catalogue_prices"("addOnOfferingId", "interval");

-- CreateIndex
CREATE UNIQUE INDEX "catalogue_prices_planOfferingId_interval_currency_key" ON "catalogue_prices"("planOfferingId", "interval", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "catalogue_prices_addOnOfferingId_interval_currency_key" ON "catalogue_prices"("addOnOfferingId", "interval", "currency");

-- CreateIndex
CREATE INDEX "plan_offering_entitlement_grants_productId_idx" ON "plan_offering_entitlement_grants"("productId");

-- CreateIndex
CREATE INDEX "plan_offering_entitlement_grants_planOfferingId_idx" ON "plan_offering_entitlement_grants"("planOfferingId");

-- CreateIndex
CREATE INDEX "plan_offering_entitlement_grants_entitlementDefinitionId_idx" ON "plan_offering_entitlement_grants"("entitlementDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_offering_entitlement_grants_planOfferingId_entitlementDefinitionId_key" ON "plan_offering_entitlement_grants"("planOfferingId", "entitlementDefinitionId");

-- CreateIndex
CREATE INDEX "add_on_offering_entitlement_grants_productId_idx" ON "add_on_offering_entitlement_grants"("productId");

-- CreateIndex
CREATE INDEX "add_on_offering_entitlement_grants_addOnOfferingId_idx" ON "add_on_offering_entitlement_grants"("addOnOfferingId");

-- CreateIndex
CREATE INDEX "add_on_offering_entitlement_grants_entitlementDefinitionId_idx" ON "add_on_offering_entitlement_grants"("entitlementDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "add_on_offering_entitlement_grants_addOnOfferingId_entitlementDefinitionId_key" ON "add_on_offering_entitlement_grants"("addOnOfferingId", "entitlementDefinitionId");

-- AddForeignKey
ALTER TABLE "commercial_plans" ADD CONSTRAINT "commercial_plans_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "commercial_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_add_ons" ADD CONSTRAINT "commercial_add_ons_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "commercial_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_definitions" ADD CONSTRAINT "entitlement_definitions_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "commercial_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogue_versions" ADD CONSTRAINT "catalogue_versions_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "commercial_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_offerings" ADD CONSTRAINT "plan_offerings_catalogueVersionId_productId_fkey"
FOREIGN KEY ("catalogueVersionId", "productId") REFERENCES "catalogue_versions"("id", "productId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_offerings" ADD CONSTRAINT "plan_offerings_planId_productId_fkey"
FOREIGN KEY ("planId", "productId") REFERENCES "commercial_plans"("id", "productId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "add_on_offerings" ADD CONSTRAINT "add_on_offerings_catalogueVersionId_productId_fkey"
FOREIGN KEY ("catalogueVersionId", "productId") REFERENCES "catalogue_versions"("id", "productId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "add_on_offerings" ADD CONSTRAINT "add_on_offerings_addOnId_productId_fkey"
FOREIGN KEY ("addOnId", "productId") REFERENCES "commercial_add_ons"("id", "productId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "add_on_offering_eligibilities" ADD CONSTRAINT "add_on_offering_eligibilities_catalogueVersionId_fkey"
FOREIGN KEY ("catalogueVersionId") REFERENCES "catalogue_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "add_on_offering_eligibilities" ADD CONSTRAINT "add_on_offering_eligibilities_addOnOfferingId_catalogueVersionId_fkey"
FOREIGN KEY ("addOnOfferingId", "catalogueVersionId") REFERENCES "add_on_offerings"("id", "catalogueVersionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "add_on_offering_eligibilities" ADD CONSTRAINT "add_on_offering_eligibilities_planOfferingId_catalogueVersionId_fkey"
FOREIGN KEY ("planOfferingId", "catalogueVersionId") REFERENCES "plan_offerings"("id", "catalogueVersionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogue_prices" ADD CONSTRAINT "catalogue_prices_planOfferingId_fkey"
FOREIGN KEY ("planOfferingId") REFERENCES "plan_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogue_prices" ADD CONSTRAINT "catalogue_prices_addOnOfferingId_fkey"
FOREIGN KEY ("addOnOfferingId") REFERENCES "add_on_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_offering_entitlement_grants" ADD CONSTRAINT "plan_offering_entitlement_grants_planOfferingId_productId_fkey"
FOREIGN KEY ("planOfferingId", "productId") REFERENCES "plan_offerings"("id", "productId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_offering_entitlement_grants" ADD CONSTRAINT "plan_offering_entitlement_grants_entitlementDefinitionId_productId_fkey"
FOREIGN KEY ("entitlementDefinitionId", "productId") REFERENCES "entitlement_definitions"("id", "productId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "add_on_offering_entitlement_grants" ADD CONSTRAINT "add_on_offering_entitlement_grants_addOnOfferingId_productId_fkey"
FOREIGN KEY ("addOnOfferingId", "productId") REFERENCES "add_on_offerings"("id", "productId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "add_on_offering_entitlement_grants" ADD CONSTRAINT "add_on_offering_entitlement_grants_entitlementDefinitionId_productId_fkey"
FOREIGN KEY ("entitlementDefinitionId", "productId") REFERENCES "entitlement_definitions"("id", "productId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Class-B RLS hardening (additive foundation tables only)
ALTER TABLE "commercial_products" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "commercial_products" FROM anon, authenticated;

ALTER TABLE "commercial_plans" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "commercial_plans" FROM anon, authenticated;

ALTER TABLE "commercial_add_ons" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "commercial_add_ons" FROM anon, authenticated;

ALTER TABLE "entitlement_definitions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "entitlement_definitions" FROM anon, authenticated;

ALTER TABLE "catalogue_versions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "catalogue_versions" FROM anon, authenticated;

ALTER TABLE "plan_offerings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "plan_offerings" FROM anon, authenticated;

ALTER TABLE "add_on_offerings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "add_on_offerings" FROM anon, authenticated;

ALTER TABLE "add_on_offering_eligibilities" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "add_on_offering_eligibilities" FROM anon, authenticated;

ALTER TABLE "catalogue_prices" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "catalogue_prices" FROM anon, authenticated;

ALTER TABLE "plan_offering_entitlement_grants" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "plan_offering_entitlement_grants" FROM anon, authenticated;

ALTER TABLE "add_on_offering_entitlement_grants" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "add_on_offering_entitlement_grants" FROM anon, authenticated;
