/*
  Billing event store foundation.

  Notes:
  - Provider integrations are intentionally out of scope.
  - This introduces an idempotent store keyed by (provider, providerEventId).
*/

-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('SIBS', 'STRIPE', 'PAYPAL');

-- CreateEnum
CREATE TYPE "BillingEventType" AS ENUM (
  'CHECKOUT_SESSION_CREATED',
  'PAYMENT_SUCCEEDED',
  'PAYMENT_FAILED',
  'SUBSCRIPTION_STARTED',
  'SUBSCRIPTION_RENEWED',
  'SUBSCRIPTION_CANCELLED',
  'SUBSCRIPTION_EXPIRED',
  'REFUND_ISSUED'
);

-- CreateEnum
CREATE TYPE "BillingEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "billing_events" (
  "id" TEXT NOT NULL,
  "provider" "BillingProvider" NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" "BillingEventType" NOT NULL,
  "organizationId" TEXT,
  "status" "BillingEventStatus" NOT NULL DEFAULT 'RECEIVED',
  "payload" JSONB NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "processingResult" JSONB,

  CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_events_organizationId_idx" ON "billing_events"("organizationId");

-- CreateIndex
CREATE INDEX "billing_events_receivedAt_idx" ON "billing_events"("receivedAt");

-- CreateIndex
CREATE INDEX "billing_events_processedAt_idx" ON "billing_events"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "billing_events_provider_providerEventId_key" ON "billing_events"("provider", "providerEventId");

-- AddForeignKey
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

