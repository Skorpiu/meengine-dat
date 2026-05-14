/**
 * Read-only: verify demo personas for a demo organization.
 * Does not print passwords, password hashes, or tokens.
 *
 * If all three DEMO_*_EMAIL env vars are set, checks that each user exists in the
 * target org with the expected role. If none are set, prints role counts only (with a notice).
 * If only some emails are set, exits with an error (ambiguous input).
 *
 * Usage:
 *   DEMO_ORGANIZATION_ID=<cuid> pnpm demo:personas:check
 *   DEMO_ORGANIZATION_ID=<cuid> DEMO_SCHOOL_ADMIN_EMAIL=... DEMO_INSTRUCTOR_EMAIL=... DEMO_STUDENT_EMAIL=... pnpm demo:personas:check
 *
 * Requires DATABASE_URL — load .env via @next/env.
 */

import { loadEnvConfig } from "@next/env";
import { PrismaClient, type UserRole } from "@prisma/client";

loadEnvConfig(process.cwd());

const EXPECTED_ADMIN_ROLE: UserRole = "SUPER_ADMIN";
const EXPECTED_INSTRUCTOR_ROLE: UserRole = "INSTRUCTOR";
const EXPECTED_STUDENT_ROLE: UserRole = "STUDENT";

function normalizeEmail(raw: string): string {
  return raw.toLowerCase().trim();
}

function trimEnv(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v === "" || v === undefined ? undefined : v;
}

async function main(): Promise<number> {
  const orgId = process.env.DEMO_ORGANIZATION_ID?.trim();
  if (!orgId) {
    console.error(
      "DEMO_ORGANIZATION_ID is not set. Set it to the demo organization id (CUID) before running.",
    );
    return 1;
  }

  const adminE = trimEnv("DEMO_SCHOOL_ADMIN_EMAIL");
  const instE = trimEnv("DEMO_INSTRUCTOR_EMAIL");
  const studE = trimEnv("DEMO_STUDENT_EMAIL");

  const setCount = [adminE, instE, studE].filter(Boolean).length;

  if (setCount !== 0 && setCount !== 3) {
    console.error(
      "Provide all three email env vars (DEMO_SCHOOL_ADMIN_EMAIL, DEMO_INSTRUCTOR_EMAIL, DEMO_STUDENT_EMAIL) for a strict check, or omit all three to only print role counts.",
    );
    return 1;
  }

  const prisma = new PrismaClient();
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, isDemo: true },
    });

    if (!org) {
      console.error(`No organization found with id "${orgId}".`);
      return 1;
    }

    if (!org.isDemo) {
      console.error(
        "Refusing to check demo personas for a non-demo organization.",
      );
      return 1;
    }

    console.log("Check demo personas (read-only)");
    console.log(`Organization: ${org.name}`);
    console.log(`isDemo: ${org.isDemo}`);
    console.log("");

    const roleCounts = await prisma.user.groupBy({
      by: ["role"],
      where: { organizationId: orgId },
      _count: { role: true },
    });

    const countByRole = new Map<UserRole, number>();
    for (const row of roleCounts) {
      countByRole.set(row.role, row._count.role);
    }

    const rolesLine = ["SUPER_ADMIN", "INSTRUCTOR", "STUDENT", "PLATFORM_ADMIN"]
      .map((r) => `${r}: ${countByRole.get(r as UserRole) ?? 0}`)
      .join(", ");
    console.log(`User counts by role in org: ${rolesLine}`);
    console.log(
      "(School Admin is expected to map to SUPER_ADMIN in the database.)",
    );
    console.log("");

    if (setCount === 0) {
      console.log(
        "Notice: demo persona emails were not set; skipped strict per-email verification. Set all three DEMO_*_EMAIL variables to require Demo School Admin, Demo Instructor, and Demo Student accounts.",
      );
      return 0;
    }

    const checks: {
      label: string;
      email: string;
      expectedRole: UserRole;
    }[] = [
      {
        label: "Demo School Admin",
        email: normalizeEmail(adminE!),
        expectedRole: EXPECTED_ADMIN_ROLE,
      },
      {
        label: "Demo Instructor",
        email: normalizeEmail(instE!),
        expectedRole: EXPECTED_INSTRUCTOR_ROLE,
      },
      {
        label: "Demo Student",
        email: normalizeEmail(studE!),
        expectedRole: EXPECTED_STUDENT_ROLE,
      },
    ];

    let failed = false;
    for (const c of checks) {
      const user = await prisma.user.findUnique({
        where: { email: c.email },
        select: {
          id: true,
          organizationId: true,
          role: true,
        },
      });

      if (!user) {
        console.log(`  ${c.label}: MISSING (no user for configured email)`);
        failed = true;
        continue;
      }

      if (user.organizationId !== orgId) {
        console.log(
          `  ${c.label}: WRONG_ORG (user exists but organizationId does not match)`,
        );
        failed = true;
        continue;
      }

      if (user.role !== c.expectedRole) {
        console.log(
          `  ${c.label}: WRONG_ROLE (found ${user.role}, expected ${c.expectedRole})`,
        );
        failed = true;
        continue;
      }

      if (c.expectedRole === "INSTRUCTOR") {
        const ins = await prisma.instructor.findUnique({
          where: { userId: user.id },
          select: { id: true },
        });
        if (!ins) {
          console.log(`  ${c.label}: MISSING_INSTRUCTOR_PROFILE`);
          failed = true;
          continue;
        }
      }

      if (c.expectedRole === "STUDENT") {
        const st = await prisma.student.findUnique({
          where: { userId: user.id },
          select: { id: true },
        });
        if (!st) {
          console.log(`  ${c.label}: MISSING_STUDENT_PROFILE`);
          failed = true;
          continue;
        }
      }

      console.log(`  ${c.label}: OK (role ${user.role})`);
    }

    console.log("");
    if (failed) {
      console.error(
        "Demo persona check failed. Run configure (dry-run first) or fix data before the client demo.",
      );
      return 1;
    }

    console.log(
      "All configured demo personas are present with expected roles.",
    );
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
