import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

/** Same message as the legacy script when email or password is missing/blank after trim. */
export const UPSERT_PLATFORM_ADMIN_MISSING_CREDENTIALS =
  "Missing PLATFORM_ADMIN_EMAIL or PLATFORM_ADMIN_PASSWORD";

const DEFAULT_FIRST_NAME = "Platform";
const DEFAULT_LAST_NAME = "Admin";
const BCRYPT_ROUNDS = 12;

export type UpsertPlatformAdminPrismaClient = {
  user: Pick<PrismaClient["user"], "upsert">;
};

export type UpsertPlatformAdminInput = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

export type UpsertPlatformAdminResult = {
  id: string;
  email: string;
  role: string;
};

/**
 * Creates or updates a PLATFORM_ADMIN user (organizationId null, approved, email verified).
 * Intended for operator scripts and future internal callers — not a public HTTP API.
 */
export async function upsertPlatformAdmin(
  prisma: UpsertPlatformAdminPrismaClient,
  input: UpsertPlatformAdminInput,
): Promise<UpsertPlatformAdminResult> {
  const email = (input.email ?? "").toLowerCase().trim();
  const password = (input.password ?? "").trim();
  if (!email || !password) {
    throw new Error(UPSERT_PLATFORM_ADMIN_MISSING_CREDENTIALS);
  }

  const firstName = input.firstName?.trim() || DEFAULT_FIRST_NAME;
  const lastName = input.lastName?.trim() || DEFAULT_LAST_NAME;

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      role: "PLATFORM_ADMIN",
      firstName,
      lastName,
      isApproved: true,
      isEmailVerified: true,
      emailVerified: new Date(),
      organizationId: null,
    },
    update: {
      passwordHash,
      role: "PLATFORM_ADMIN",
      isApproved: true,
      isEmailVerified: true,
      emailVerified: new Date(),
      organizationId: null,
    },
    select: { id: true, email: true, role: true },
  });

  return user;
}
