-- Solution #8 / AUTH-SESSION-001: JWT session revocation epoch on User.
-- Additive only. Remote apply remains separately human-gated (DEC-069).
ALTER TABLE "users"
ADD COLUMN "authSessionVersion" INTEGER NOT NULL DEFAULT 0;
