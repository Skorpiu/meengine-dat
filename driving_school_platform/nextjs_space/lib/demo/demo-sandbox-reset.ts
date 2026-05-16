/**
 * Demo sandbox reset: delete lessons and vehicles for a demo organization only.
 * Does not touch users, personas, domains, features, entitlements, settings, or billing.
 */

import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma as defaultPrisma } from "@/lib/db";

export type DemoSandboxResetResult = {
  organizationId: string;
  organizationName: string;
  plannedLessons: number;
  plannedVehicles: number;
  deletedLessons: number;
  deletedVehicles: number;
  applied: boolean;
};

export type DemoSandboxResetErrorCode =
  | "organization_not_found"
  | "not_demo_organization"
  | "database_error";

export class DemoSandboxResetError extends Error {
  readonly code: DemoSandboxResetErrorCode;

  constructor(code: DemoSandboxResetErrorCode, message: string) {
    super(message);
    this.name = "DemoSandboxResetError";
    this.code = code;
  }
}

type DemoSandboxResetClient = Pick<
  PrismaClient,
  "organization" | "lesson" | "vehicle" | "$transaction"
>;

export async function resetDemoSandbox(input: {
  organizationId: string;
  apply: boolean;
  prisma?: DemoSandboxResetClient;
}): Promise<DemoSandboxResetResult> {
  const db = input.prisma ?? defaultPrisma;
  const orgId = input.organizationId.trim();

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, isDemo: true },
  });

  if (!org) {
    throw new DemoSandboxResetError(
      "organization_not_found",
      "No organization found for the given id.",
    );
  }

  if (!org.isDemo) {
    throw new DemoSandboxResetError(
      "not_demo_organization",
      "Refusing to reset sandbox for a non-demo organization.",
    );
  }

  const plannedLessons = await db.lesson.count({
    where: { organizationId: orgId },
  });
  const plannedVehicles = await db.vehicle.count({
    where: { organizationId: orgId },
  });

  if (!input.apply) {
    return {
      organizationId: org.id,
      organizationName: org.name,
      plannedLessons,
      plannedVehicles,
      deletedLessons: 0,
      deletedVehicles: 0,
      applied: false,
    };
  }

  let deletedLessons = 0;
  let deletedVehicles = 0;

  try {
    await db.$transaction(
      async (tx) => {
        const lr = await tx.lesson.deleteMany({
          where: { organizationId: orgId },
        });
        deletedLessons = lr.count;

        const vr = await tx.vehicle.deleteMany({
          where: { organizationId: orgId },
        });
        deletedVehicles = vr.count;
      },
      {
        maxWait: 10_000,
        timeout: 120_000,
      },
    );
  } catch (e: unknown) {
    const message =
      e instanceof Prisma.PrismaClientKnownRequestError
        ? "Database refused the delete (foreign key or constraint)."
        : e instanceof Error
          ? e.message
          : "Unknown error during transaction.";
    throw new DemoSandboxResetError("database_error", message);
  }

  return {
    organizationId: org.id,
    organizationName: org.name,
    plannedLessons,
    plannedVehicles,
    deletedLessons,
    deletedVehicles,
    applied: true,
  };
}
