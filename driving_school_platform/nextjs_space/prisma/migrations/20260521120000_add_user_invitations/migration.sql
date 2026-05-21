/*
  User invitations foundation (invite-only B2B).

  Notes:
  - Stores tokenHash only; raw invite tokens are never persisted.
  - Role allowlist (STUDENT | INSTRUCTOR) is enforced in application code (batch 2+).
  - Partial unique (organizationId, email) WHERE status = PENDING is deferred;
    duplicate pending invites per org/email are prevented in the admin API layer until
    a follow-up migration adds the partial index if product requires DB enforcement.
*/

-- CreateEnum
CREATE TYPE "UserInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "user_invitations" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "UserInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "acceptedUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_tokenHash_key" ON "user_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "user_invitations_organizationId_idx" ON "user_invitations"("organizationId");

-- CreateIndex
CREATE INDEX "user_invitations_organizationId_email_idx" ON "user_invitations"("organizationId", "email");

-- CreateIndex
CREATE INDEX "user_invitations_organizationId_status_idx" ON "user_invitations"("organizationId", "status");

-- CreateIndex
CREATE INDEX "user_invitations_expiresAt_idx" ON "user_invitations"("expiresAt");

-- CreateIndex
CREATE INDEX "user_invitations_createdByUserId_idx" ON "user_invitations"("createdByUserId");

-- CreateIndex
CREATE INDEX "user_invitations_acceptedUserId_idx" ON "user_invitations"("acceptedUserId");

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_acceptedUserId_fkey"
FOREIGN KEY ("acceptedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
