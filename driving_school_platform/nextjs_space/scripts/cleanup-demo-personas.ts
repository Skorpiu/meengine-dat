/**
 * Operator script: remove explicitly listed users from a **demo** organization only.
 * Use for obsolete temporary personas (e.g. old Gmail) after canonical @meengine.io accounts exist.
 * Does not print passwords, password hashes, or tokens.
 *
 * Default: dry-run. Apply requires both:
 *   - CLI: --apply
 *   - env: DEMO_PERSONA_CLEANUP_APPLY=true
 *
 * Never deletes @meengine.io addresses via this script. Never touches PLATFORM_ADMIN users.
 * Does not delete OrganizationFeature, EntitlementGrant, or billing rows.
 *
 * Requires DATABASE_URL — load .env via @next/env.
 */

import { loadEnvConfig } from "@next/env";
import type { Prisma } from "@prisma/client";
import { PrismaClient, type UserRole } from "@prisma/client";

loadEnvConfig(process.cwd());

type Tx = Prisma.TransactionClient;

function wantsApply(): boolean {
  const envOk =
    process.env.DEMO_PERSONA_CLEANUP_APPLY?.trim().toLowerCase() === "true";
  const argvOk = process.argv.includes("--apply");
  return envOk && argvOk;
}

function normalizeEmail(raw: string): string {
  return raw.toLowerCase().trim();
}

function maskEmail(email: string): string {
  const lower = email.toLowerCase().trim();
  const at = lower.indexOf("@");
  if (at < 0) return "***";
  const local = lower.slice(0, at);
  const domain = lower.slice(at + 1);
  if (local.length === 0) return `***@${domain}`;
  return `${local.slice(0, 1)}***@${domain}`;
}

function parseCleanupEmails(
  raw: string | undefined,
): string[] | { error: string } {
  if (raw === undefined || raw.trim() === "") {
    return { error: "DEMO_PERSONA_CLEANUP_EMAILS is not set or empty." };
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const e = normalizeEmail(part);
    if (e === "") continue;
    if (seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  if (out.length === 0) {
    return {
      error:
        "DEMO_PERSONA_CLEANUP_EMAILS has no usable addresses after parsing (comma-separated list).",
    };
  }
  for (const e of out) {
    if (e.endsWith("@meengine.io")) {
      return {
        error: `Refusing: ${maskEmail(e)} is an @meengine.io address. This script never removes canonical demo aliases.`,
      };
    }
  }
  return out;
}

type InScopeUser = {
  email: string;
  userId: string;
  role: UserRole;
  hasInstructor: boolean;
  hasStudent: boolean;
};

async function blockingRelations(
  prisma: PrismaClient,
  userId: string,
): Promise<string[]> {
  const reasons: string[] = [];

  const al = await prisma.auditLog.count({ where: { userId } });
  if (al > 0) reasons.push(`audit_logs (userId): ${al}`);

  const lrRev = await prisma.lessonRequest.count({
    where: { reviewedBy: userId },
  });
  if (lrRev > 0) reasons.push(`lesson_requests (reviewedBy): ${lrRev}`);

  const leCan = await prisma.lesson.count({ where: { cancelledBy: userId } });
  if (leCan > 0) reasons.push(`lessons (cancelledBy): ${leCan}`);

  const student = await prisma.student.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (student) {
    const sid = student.id;
    const les = await prisma.lesson.count({ where: { studentId: sid } });
    if (les > 0) reasons.push(`lessons (student): ${les}`);
    const lreq = await prisma.lessonRequest.count({
      where: { studentId: sid },
    });
    if (lreq > 0) reasons.push(`lesson_requests (student): ${lreq}`);
    const lc = await prisma.lessonCounter.count({ where: { studentId: sid } });
    if (lc > 0) reasons.push(`lesson_counters: ${lc}`);
    const er = await prisma.examRegistration.count({
      where: { studentId: sid },
    });
    if (er > 0) reasons.push(`exam_registrations: ${er}`);
    const paySt = await prisma.payment.count({ where: { studentId: sid } });
    if (paySt > 0) reasons.push(`payments (studentId): ${paySt}`);
  }

  const payUser = await prisma.payment.count({ where: { userId } });
  if (payUser > 0) reasons.push(`payments (userId): ${payUser}`);

  const instructor = await prisma.instructor.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (instructor) {
    const iid = instructor.id;
    const lesI = await prisma.lesson.count({ where: { instructorId: iid } });
    if (lesI > 0) reasons.push(`lessons (instructor): ${lesI}`);
    const lrqI = await prisma.lessonRequest.count({
      where: { instructorId: iid },
    });
    if (lrqI > 0) reasons.push(`lesson_requests (instructor): ${lrqI}`);
    const ex = await prisma.exam.count({ where: { examinerId: iid } });
    if (ex > 0) reasons.push(`exams (examiner): ${ex}`);
    const pref = await prisma.student.count({
      where: { preferredInstructorId: iid },
    });
    if (pref > 0) reasons.push(`students (preferredInstructorId): ${pref}`);
  }

  return reasons;
}

async function removeUserAndProfiles(tx: Tx, userId: string): Promise<void> {
  await tx.instructor.deleteMany({ where: { userId } });
  await tx.student.deleteMany({ where: { userId } });
  await tx.user.delete({ where: { id: userId } });
}

async function main(): Promise<number> {
  const orgId = process.env.DEMO_ORGANIZATION_ID?.trim();
  if (!orgId) {
    console.error(
      "DEMO_ORGANIZATION_ID is not set. Set it to the demo organization id (CUID) before running.",
    );
    return 1;
  }

  const parsed = parseCleanupEmails(process.env.DEMO_PERSONA_CLEANUP_EMAILS);
  if ("error" in parsed) {
    console.error(parsed.error);
    return 1;
  }
  const emails = parsed;

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
        "Refusing to cleanup personas for a non-demo organization.",
      );
      return 1;
    }

    const apply = wantsApply();
    const mode = apply ? "APPLY" : "DRY-RUN";

    const missing: string[] = [];
    const fatal: string[] = [];
    const inScope: InScopeUser[] = [];
    const blocksByUserId = new Map<string, string[]>();

    for (const email of emails) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          organizationId: true,
          role: true,
          instructor: { select: { id: true } },
          student: { select: { id: true } },
        },
      });

      if (!user) {
        missing.push(email);
        continue;
      }

      if (user.role === "PLATFORM_ADMIN") {
        fatal.push(
          `Refusing: ${maskEmail(email)} is PLATFORM_ADMIN. This script never removes platform admins.`,
        );
        continue;
      }

      if (user.organizationId !== orgId) {
        fatal.push(
          `Refusing: ${maskEmail(email)} belongs to a different organization (or has no organization). Users are not moved or deleted outside the target demo org.`,
        );
        continue;
      }

      const blockers = await blockingRelations(prisma, user.id);
      if (blockers.length > 0) {
        blocksByUserId.set(user.id, blockers);
      }

      inScope.push({
        email,
        userId: user.id,
        role: user.role,
        hasInstructor: user.instructor !== null,
        hasStudent: user.student !== null,
      });
    }

    console.log("Cleanup old demo personas");
    console.log(`Organization: ${org.name} (${org.id})`);
    console.log(`isDemo: ${org.isDemo}`);
    console.log(`Mode: ${mode}`);
    console.log("");
    console.log("Target emails (masked):");
    for (const e of emails) {
      console.log(`  - ${maskEmail(e)}`);
    }
    console.log("");

    if (missing.length > 0) {
      console.log("Warnings (not in database — nothing to delete):");
      for (const e of missing) {
        console.log(`  - ${maskEmail(e)}: no user row found`);
      }
      console.log("");
    }

    if (fatal.length > 0) {
      for (const line of fatal) {
        console.error(line);
      }
      return 1;
    }

    for (const u of inScope) {
      const b = blocksByUserId.get(u.userId);
      console.log(
        `Planned user: ${maskEmail(u.email)} — role ${u.role}; Instructor profile: ${u.hasInstructor}; Student profile: ${u.hasStudent}`,
      );
      if (b && b.length > 0) {
        console.log("  Blocking relations (must be cleared before delete):");
        for (const line of b) {
          console.log(`    - ${line}`);
        }
      } else {
        console.log(
          "  No blocking relations detected for this batch’s checks.",
        );
      }
    }
    console.log("");

    if (blocksByUserId.size > 0) {
      console.error(
        "Refusing to proceed: one or more in-scope users have blocking foreign-key data. Resolve manually (reassign or delete dependent rows) before running apply.",
      );
      return 1;
    }

    if (inScope.length === 0) {
      console.log(
        "Nothing to delete: no in-scope users matched (only missing emails or all refused).",
      );
      console.log("");
      console.log("Result: PASS (no-op).");
      return 0;
    }

    if (!apply) {
      const envApply =
        process.env.DEMO_PERSONA_CLEANUP_APPLY?.trim().toLowerCase() === "true";
      const cliApply = process.argv.includes("--apply");
      if (cliApply && !envApply) {
        console.log(
          "Note: --apply was passed but DEMO_PERSONA_CLEANUP_APPLY is not true; no writes performed.",
        );
      } else if (envApply && !cliApply) {
        console.log(
          "Note: DEMO_PERSONA_CLEANUP_APPLY=true but --apply was not passed (use `pnpm demo:personas:cleanup -- --apply`); no writes performed.",
        );
      } else if (!cliApply && !envApply) {
        console.log(
          "Note: to apply, pass --apply and set DEMO_PERSONA_CLEANUP_APPLY=true (both are required).",
        );
      }
      console.log("");
      console.log("Dry run only. No data was changed.");
      return 0;
    }

    try {
      await prisma.$transaction(async (tx) => {
        for (const u of inScope) {
          await removeUserAndProfiles(tx, u.userId);
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        "Deletion failed (transaction rolled back). Resolve dependent data or database constraints.",
      );
      console.error(msg);
      return 1;
    }

    console.log(
      `Applied: removed ${inScope.length} user(s) and associated Instructor/Student profiles where present.`,
    );
    console.log("Passwords and hashes were not printed.");
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
