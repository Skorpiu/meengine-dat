/**
 * Operator script: create or update three private demo users (School Admin, Instructor, Student)
 * on a demo organization. Does not print passwords, password hashes, or tokens.
 *
 * Default: dry-run. Apply requires both:
 *   - CLI: --apply
 *   - env: DEMO_PERSONAS_APPLY=true
 *
 * Never creates PLATFORM_ADMIN users.
 *
 * Requires DATABASE_URL — load .env via @next/env (same as other demo scripts).
 */

import { createHash } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import type { Prisma } from "@prisma/client";
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { commonSchemas } from "../lib/validation";

loadEnvConfig(process.cwd());

const BCRYPT_ROUNDS = 12;

const ADMIN_ROLE: UserRole = "SUPER_ADMIN";
const INSTRUCTOR_ROLE: UserRole = "INSTRUCTOR";
const STUDENT_ROLE: UserRole = "STUDENT";

type Tx = Prisma.TransactionClient;

function wantsApply(): boolean {
  const envOk =
    process.env.DEMO_PERSONAS_APPLY?.trim().toLowerCase() === "true";
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

function requireEnv(name: string): string | { error: string } {
  const v = process.env[name]?.trim();
  if (!v) {
    return { error: `${name} is not set or empty.` };
  }
  return v;
}

function validateEmailEnv(
  name: string,
  value: string,
): true | { error: string } {
  const r = commonSchemas.email.safeParse(value);
  if (!r.success) {
    const msg = r.error.flatten().formErrors.join("; ") || "Invalid email";
    return { error: `${name}: ${msg}` };
  }
  return true;
}

function validatePasswordEnv(
  name: string,
  value: string,
): true | { error: string } {
  const r = commonSchemas.password.safeParse(value);
  if (!r.success) {
    const msg = r.error.flatten().formErrors.join("; ") || "Invalid password";
    return { error: `${name}: ${msg}` };
  }
  return true;
}

type PersonaSpec = {
  label: string;
  internalRole: UserRole;
  emailEnv: string;
  passwordEnv: string;
  email: string;
  password: string;
};

function collectPersonas(): { personas: PersonaSpec[] } | { error: string } {
  const pairs: [string, string, string, UserRole][] = [
    [
      "DEMO_SCHOOL_ADMIN_EMAIL",
      "DEMO_SCHOOL_ADMIN_PASSWORD",
      "Demo School Admin",
      ADMIN_ROLE,
    ],
    [
      "DEMO_INSTRUCTOR_EMAIL",
      "DEMO_INSTRUCTOR_PASSWORD",
      "Demo Instructor",
      INSTRUCTOR_ROLE,
    ],
    [
      "DEMO_STUDENT_EMAIL",
      "DEMO_STUDENT_PASSWORD",
      "Demo Student",
      STUDENT_ROLE,
    ],
  ];

  const personas: PersonaSpec[] = [];

  for (const [emailEnv, passwordEnv, label, internalRole] of pairs) {
    const e = requireEnv(emailEnv);
    if (typeof e !== "string") return e;
    const p = requireEnv(passwordEnv);
    if (typeof p !== "string") return p;

    const email = normalizeEmail(e);
    const ev = validateEmailEnv(emailEnv, email);
    if (ev !== true) return ev;
    const pv = validatePasswordEnv(passwordEnv, p);
    if (pv !== true) return pv;

    personas.push({
      label,
      internalRole,
      emailEnv,
      passwordEnv,
      email,
      password: p,
    });
  }

  const seen = new Set<string>();
  for (const p of personas) {
    if (seen.has(p.email)) {
      return {
        error: `Duplicate email after normalization: ${maskEmail(p.email)}. Each persona must use a distinct email.`,
      };
    }
    seen.add(p.email);
  }

  return { personas };
}

async function assertUserAssignableToDemoOrg(
  prisma: PrismaClient,
  orgId: string,
  email: string,
): Promise<{ ok: true } | { error: string }> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      organizationId: true,
      role: true,
    },
  });

  if (!user) return { ok: true };

  if (user.role === "PLATFORM_ADMIN") {
    return {
      error: `Refusing: email ${maskEmail(email)} is already a PLATFORM_ADMIN user. This script never configures platform admins.`,
    };
  }

  if (user.organizationId === null) {
    return {
      error: `Refusing: email ${maskEmail(email)} already exists without organizationId. Assign or clean up that user manually before running this script.`,
    };
  }

  if (user.organizationId !== orgId) {
    return {
      error: `Refusing: email ${maskEmail(email)} already belongs to another organization (${user.organizationId}). Users are not moved automatically.`,
    };
  }

  return { ok: true };
}

function instructorLicenseFor(orgId: string, email: string): string {
  const h = createHash("sha256")
    .update(`${orgId}:${email}:instructor`)
    .digest("hex")
    .slice(0, 24);
  return `DEMO-INS-${h}`;
}

async function removeInstructorProfile(tx: Tx, userId: string): Promise<void> {
  await tx.instructor.deleteMany({ where: { userId } });
}

async function removeStudentProfile(tx: Tx, userId: string): Promise<void> {
  await tx.student.deleteMany({ where: { userId } });
}

async function upsertSchoolAdmin(
  tx: Tx,
  orgId: string,
  email: string,
  passwordHash: string,
): Promise<"created" | "updated"> {
  const existing = await tx.user.findUnique({
    where: { email },
    select: {
      id: true,
      organizationId: true,
      role: true,
    },
  });

  if (existing) {
    await removeStudentProfile(tx, existing.id);
    await removeInstructorProfile(tx, existing.id);
    await tx.user.update({
      where: { id: existing.id },
      data: {
        organizationId: orgId,
        role: ADMIN_ROLE,
        passwordHash,
        firstName: "Demo",
        lastName: "School Admin",
        isEmailVerified: true,
        isApproved: true,
      },
    });
    return "updated";
  }

  await tx.user.create({
    data: {
      email,
      organizationId: orgId,
      role: ADMIN_ROLE,
      passwordHash,
      firstName: "Demo",
      lastName: "School Admin",
      isEmailVerified: true,
      isApproved: true,
    },
  });
  return "created";
}

async function upsertInstructor(
  tx: Tx,
  orgId: string,
  email: string,
  passwordHash: string,
): Promise<"created" | "updated"> {
  const existing = await tx.user.findUnique({
    where: { email },
    select: { id: true, organizationId: true, role: true },
  });

  let userId: string;
  let created = false;

  if (existing) {
    await removeStudentProfile(tx, existing.id);
    userId = existing.id;
    await tx.user.update({
      where: { id: userId },
      data: {
        organizationId: orgId,
        role: INSTRUCTOR_ROLE,
        passwordHash,
        firstName: "Demo",
        lastName: "Instructor",
        isEmailVerified: true,
        isApproved: true,
      },
    });
  } else {
    const u = await tx.user.create({
      data: {
        email,
        organizationId: orgId,
        role: INSTRUCTOR_ROLE,
        passwordHash,
        firstName: "Demo",
        lastName: "Instructor",
        isEmailVerified: true,
        isApproved: true,
      },
    });
    userId = u.id;
    created = true;
  }

  const ins = await tx.instructor.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!ins) {
    const license = instructorLicenseFor(orgId, email);
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 2);
    await tx.instructor.create({
      data: {
        userId,
        organizationId: orgId,
        instructorLicenseNumber: license,
        instructorLicenseExpiry: expiry,
        isAvailableForBooking: true,
      },
    });
  } else {
    await tx.instructor.update({
      where: { userId },
      data: { organizationId: orgId },
    });
  }

  return created ? "created" : "updated";
}

async function upsertStudent(
  tx: Tx,
  orgId: string,
  email: string,
  passwordHash: string,
): Promise<"created" | "updated"> {
  const existing = await tx.user.findUnique({
    where: { email },
    select: { id: true, organizationId: true, role: true },
  });

  let userId: string;
  let created = false;

  if (existing) {
    await removeInstructorProfile(tx, existing.id);
    userId = existing.id;
    await tx.user.update({
      where: { id: userId },
      data: {
        organizationId: orgId,
        role: STUDENT_ROLE,
        passwordHash,
        firstName: "Demo",
        lastName: "Student",
        isEmailVerified: true,
        isApproved: true,
      },
    });
  } else {
    const u = await tx.user.create({
      data: {
        email,
        organizationId: orgId,
        role: STUDENT_ROLE,
        passwordHash,
        firstName: "Demo",
        lastName: "Student",
        isEmailVerified: true,
        isApproved: true,
      },
    });
    userId = u.id;
    created = true;
  }

  const st = await tx.student.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!st) {
    await tx.student.create({
      data: {
        userId,
        organizationId: orgId,
      },
    });
  } else {
    await tx.student.update({
      where: { userId },
      data: { organizationId: orgId },
    });
  }

  return created ? "created" : "updated";
}

async function main(): Promise<number> {
  const orgIdRaw = process.env.DEMO_ORGANIZATION_ID?.trim();
  if (!orgIdRaw) {
    console.error(
      "DEMO_ORGANIZATION_ID is not set. Set it to the demo organization id (CUID) before running.",
    );
    return 1;
  }

  const collected = collectPersonas();
  if ("error" in collected) {
    console.error(collected.error);
    return 1;
  }
  const { personas } = collected;

  const prisma = new PrismaClient();
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgIdRaw },
      select: { id: true, name: true, isDemo: true },
    });

    if (!org) {
      console.error(`No organization found with id "${orgIdRaw}".`);
      return 1;
    }

    if (!org.isDemo) {
      console.error(
        "Refusing to configure demo personas for a non-demo organization.",
      );
      return 1;
    }

    for (const p of personas) {
      const check = await assertUserAssignableToDemoOrg(
        prisma,
        org.id,
        p.email,
      );
      if ("error" in check) {
        console.error(check.error);
        return 1;
      }
    }

    const apply = wantsApply();
    const mode = apply ? "APPLY" : "DRY-RUN";

    console.log("Configure private demo personas");
    console.log(`Organization: ${org.name} (${org.id})`);
    console.log(`isDemo: ${org.isDemo}`);
    console.log(`Mode: ${mode}`);
    console.log("");
    console.log("Target personas (passwords are never printed):");
    for (const p of personas) {
      console.log(
        `  - ${p.label} → internal role ${p.internalRole}; email (redacted): ${maskEmail(p.email)}`,
      );
    }
    console.log("");

    if (!apply) {
      const envApply =
        process.env.DEMO_PERSONAS_APPLY?.trim().toLowerCase() === "true";
      const cliApply = process.argv.includes("--apply");
      if (cliApply && !envApply) {
        console.log(
          "Note: --apply was passed but DEMO_PERSONAS_APPLY is not true; no writes performed.",
        );
      } else if (envApply && !cliApply) {
        console.log(
          "Note: DEMO_PERSONAS_APPLY=true but --apply was not passed (use `pnpm demo:personas:configure -- --apply`); no writes performed.",
        );
      } else if (!cliApply && !envApply) {
        console.log(
          "Note: to apply, pass --apply and set DEMO_PERSONAS_APPLY=true (both are required).",
        );
      }
      console.log("");
      console.log("Planned writes on apply:");
      console.log(
        "  - Upsert 3 users with hashed passwords (bcrypt, same cost as app signup).",
      );
      console.log(
        "  - School Admin → SUPER_ADMIN; ensure no student/instructor profile on that user.",
      );
      console.log(
        "  - Instructor → INSTRUCTOR + Instructor row (license auto-generated).",
      );
      console.log("  - Student → STUDENT + Student row.");
      console.log("");
      console.log("Dry run only. No data was changed.");
      return 0;
    }

    const [admin, instructor, student] = personas;

    const results = await prisma.$transaction(async (tx) => {
      const adminHash = await bcrypt.hash(admin.password, BCRYPT_ROUNDS);
      const instHash = await bcrypt.hash(instructor.password, BCRYPT_ROUNDS);
      const stuHash = await bcrypt.hash(student.password, BCRYPT_ROUNDS);

      const a = await upsertSchoolAdmin(tx, org.id, admin.email, adminHash);
      const i = await upsertInstructor(tx, org.id, instructor.email, instHash);
      const s = await upsertStudent(tx, org.id, student.email, stuHash);
      return { admin: a, instructor: i, student: s };
    });

    console.log("Applied successfully (passwords and hashes not printed).");
    console.log(`  Demo School Admin: ${results.admin}`);
    console.log(`  Demo Instructor: ${results.instructor}`);
    console.log(`  Demo Student: ${results.student}`);
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
