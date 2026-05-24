-- Distributed auth/email rate limit buckets (DAT_3.5 auth-rate-limit-foundation).
-- Stores action + SHA-256 keyHash + fixed window start; never raw email/IP/token.

CREATE TABLE "rate_limit_buckets" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rate_limit_buckets_action_keyHash_windowStart_key"
  ON "rate_limit_buckets"("action", "keyHash", "windowStart");

CREATE INDEX "rate_limit_buckets_action_windowStart_idx"
  ON "rate_limit_buckets"("action", "windowStart");

CREATE INDEX "rate_limit_buckets_windowStart_idx"
  ON "rate_limit_buckets"("windowStart");
