/**
 * Read-only aggregated smoke for a controlled client/recruiter demo org.
 * Combines organization/demo checks, optional persona verification (by email env),
 * domains, user role counts, OrganizationFeature rows, and EntitlementGrant window counts.
 * Does not print passwords, password hashes, tokens, or grant ids.
 * Does not invoke other pnpm scripts — uses Prisma only.
 *
 * Usage:
 *   DEMO_ORGANIZATION_ID=<cuid> pnpm demo:client-ready
 *   DEMO_ORGANIZATION_ID=<cuid> DEMO_SCHOOL_ADMIN_EMAIL=... DEMO_INSTRUCTOR_EMAIL=... DEMO_STUDENT_EMAIL=... pnpm demo:client-ready
 */

import { loadEnvConfig } from "@next/env";
import { PrismaClient, type UserRole } from "@prisma/client";

loadEnvConfig(process.cwd());

const ADMIN_ROLE: UserRole = "SUPER_ADMIN";
const INSTRUCTOR_ROLE: UserRole = "INSTRUCTOR";
const STUDENT_ROLE: UserRole = "STUDENT";

function normalizeEmail(raw: string): string {
  return raw.toLowerCase().trim();
}

function trimEnv(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v === "" || v === undefined ? undefined : v;
}

type PersonaLine = { line: string; ok: boolean };

async function evaluatePersonas(
  prisma: PrismaClient,
  orgId: string,
  adminEmail: string,
  instEmail: string,
  studEmail: string,
): Promise<PersonaLine[]> {
  const checks: {
    label: string;
    email: string;
    expectedRole: UserRole;
    needInstructorProfile: boolean;
    needStudentProfile: boolean;
  }[] = [
    {
      label: "Demo School Admin",
      email: normalizeEmail(adminEmail),
      expectedRole: ADMIN_ROLE,
      needInstructorProfile: false,
      needStudentProfile: false,
    },
    {
      label: "Demo Instructor",
      email: normalizeEmail(instEmail),
      expectedRole: INSTRUCTOR_ROLE,
      needInstructorProfile: true,
      needStudentProfile: false,
    },
    {
      label: "Demo Student",
      email: normalizeEmail(studEmail),
      expectedRole: STUDENT_ROLE,
      needInstructorProfile: false,
      needStudentProfile: true,
    },
  ];

  const out: PersonaLine[] = [];

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
      out.push({
        line: `${c.label}: FAIL (missing user for configured email)`,
        ok: false,
      });
      continue;
    }

    if (user.organizationId !== orgId) {
      out.push({
        line: `${c.label}: FAIL (user not in this organization)`,
        ok: false,
      });
      continue;
    }

    if (user.role !== c.expectedRole) {
      out.push({
        line: `${c.label}: FAIL (expected role ${c.expectedRole}, found ${user.role})`,
        ok: false,
      });
      continue;
    }

    if (c.needInstructorProfile) {
      const ins = await prisma.instructor.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!ins) {
        out.push({
          line: `${c.label}: FAIL (missing Instructor profile)`,
          ok: false,
        });
        continue;
      }
    }

    if (c.needStudentProfile) {
      const st = await prisma.student.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!st) {
        out.push({
          line: `${c.label}: FAIL (missing Student profile)`,
          ok: false,
        });
        continue;
      }
    }

    out.push({
      line: `${c.label}: present`,
      ok: true,
    });
  }

  return out;
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
  const emailSetCount = [adminE, instE, studE].filter(Boolean).length;

  if (emailSetCount !== 0 && emailSetCount !== 3) {
    console.error(
      "Provide all three persona email env vars (DEMO_SCHOOL_ADMIN_EMAIL, DEMO_INSTRUCTOR_EMAIL, DEMO_STUDENT_EMAIL) to verify personas, or omit all three.",
    );
    return 1;
  }

  const prisma = new PrismaClient();
  const warnings: string[] = [];

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
        "Client demo readiness failed: organization is not marked as demo.",
      );
      return 1;
    }

    const platformAdminInOrg = await prisma.user.count({
      where: { organizationId: orgId, role: "PLATFORM_ADMIN" },
    });

    if (platformAdminInOrg > 0) {
      console.error(
        "Client demo readiness failed: PLATFORM_ADMIN users must not be scoped to this demo organization.",
      );
      return 1;
    }

    const now = new Date();

    const [
      domains,
      roleGroups,
      userTotal,
      features,
      scheduledGrants,
      activeGrants,
      expiredGrants,
    ] = await Promise.all([
      prisma.organizationDomain.findMany({
        where: { organizationId: orgId },
        select: { host: true },
        orderBy: [{ host: "asc" }],
      }),
      prisma.user.groupBy({
        by: ["role"],
        where: { organizationId: orgId },
        _count: { _all: true },
      }),
      prisma.user.count({ where: { organizationId: orgId } }),
      prisma.organizationFeature.findMany({
        where: { organizationId: orgId },
        select: { featureKey: true, isEnabled: true },
        orderBy: { featureKey: "asc" },
      }),
      prisma.entitlementGrant.count({
        where: { organizationId: orgId, startsAt: { gt: now } },
      }),
      prisma.entitlementGrant.count({
        where: {
          organizationId: orgId,
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      prisma.entitlementGrant.count({
        where: {
          organizationId: orgId,
          expiresAt: { not: null, lte: now },
          startsAt: { lte: now },
        },
      }),
    ]);

    const byRole: Partial<Record<UserRole, number>> = {};
    for (const row of roleGroups) {
      byRole[row.role] = row._count._all;
    }

    const grantTotal = scheduledGrants + activeGrants + expiredGrants;

    if (domains.length === 0) {
      warnings.push(
        "No organization domains mapped — tenant host resolution may fail.",
      );
    }

    if (features.length === 0 && grantTotal === 0) {
      warnings.push(
        "No OrganizationFeature rows and no entitlement grant rows — showcase/licensing UI may be empty.",
      );
    }

    if (emailSetCount === 0 && userTotal === 0) {
      warnings.push(
        "No users in this organization; persona emails were not set — configure users before the demo.",
      );
    }

    let personaLines: PersonaLine[] = [];
    if (emailSetCount === 3) {
      personaLines = await evaluatePersonas(
        prisma,
        orgId,
        adminE!,
        instE!,
        studE!,
      );
    }

    const personaFatal = personaLines.some((p) => !p.ok);

    console.log("Client demo readiness smoke");
    console.log(`Organization: ${org.name}`);
    console.log(`isDemo: ${org.isDemo}`);
    console.log("");
    console.log("Domains:");
    if (domains.length === 0) {
      console.log("  (none)");
    } else {
      for (const d of domains) {
        console.log(`  - ${d.host}`);
      }
    }
    console.log("");
    console.log(`Users in organization: ${userTotal}`);
    const roleSummary = (
      ["SUPER_ADMIN", "INSTRUCTOR", "STUDENT", "PLATFORM_ADMIN"] as const
    )
      .map((r) => `${r}=${byRole[r as UserRole] ?? 0}`)
      .join(", ");
    console.log(`By role: ${roleSummary}`);
    console.log("");
    console.log("Personas:");
    if (emailSetCount === 0) {
      console.log(
        "  (not verified — set DEMO_SCHOOL_ADMIN_EMAIL, DEMO_INSTRUCTOR_EMAIL, and DEMO_STUDENT_EMAIL to enforce Demo School Admin / Instructor / Student)",
      );
    } else {
      for (const p of personaLines) {
        console.log(`  - ${p.line}`);
      }
    }
    console.log("");
    console.log("Features:");
    if (features.length === 0) {
      console.log("  (none)");
    } else {
      for (const f of features) {
        console.log(
          `  - ${f.featureKey}: ${f.isEnabled ? "enabled" : "disabled"}`,
        );
      }
    }
    console.log("");
    console.log("Entitlement grants (counts only):");
    console.log(`  - scheduled (startsAt > now): ${scheduledGrants}`);
    console.log(`  - active (started, not expired): ${activeGrants}`);
    console.log(
      `  - expired (expiresAt <= now, was started): ${expiredGrants}`,
    );
    console.log(`  - total rows: ${grantTotal}`);

    if (warnings.length > 0) {
      console.log("");
      console.log("Warnings:");
      for (const w of warnings) {
        console.log(`  - ${w}`);
      }
    }

    console.log("");

    if (personaFatal) {
      console.log("Result:");
      console.log(
        "FAIL — persona verification failed (see Personas section). Fix with demo:personas:configure or data cleanup.",
      );
      return 1;
    }

    console.log("Result:");
    console.log("PASS — demo is ready for controlled client/recruiter use.");
    console.log(
      "(Still do a manual login on the demo hostname before the meeting — this script does not authenticate.)",
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
