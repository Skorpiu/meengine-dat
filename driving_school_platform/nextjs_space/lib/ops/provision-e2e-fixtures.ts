/**
 * Deterministic disposable browser-E2E fixtures (TEST-HYGIENE-001).
 *
 * Owned by the local browser-E2E orchestrator. Not Production smoke fixtures,
 * not operator accounts, and not shared Supabase data. Never logs passwords.
 *
 * Does not connect until the caller supplies a Prisma client bound to the
 * already-validated disposable E2E database URL.
 */

import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

export const E2E_FIXTURE_ORG_ID = "00000000-0000-4000-8000-000000000001";
export const E2E_FIXTURE_ADMIN_USER_ID = "00000000-0000-4000-8000-000000000002";
export const E2E_FIXTURE_INSTRUCTOR_USER_ID =
  "00000000-0000-4000-8000-000000000003";
export const E2E_FIXTURE_INSTRUCTOR_ROW_ID =
  "00000000-0000-4000-8000-000000000004";
export const E2E_FIXTURE_STUDENT_1_USER_ID =
  "00000000-0000-4000-8000-000000000005";
export const E2E_FIXTURE_STUDENT_1_ID = "00000000-0000-4000-8000-000000000006";
export const E2E_FIXTURE_STUDENT_2_USER_ID =
  "00000000-0000-4000-8000-000000000007";
export const E2E_FIXTURE_STUDENT_2_ID = "00000000-0000-4000-8000-000000000008";

export const E2E_FIXTURE_ORG_NAME = "DAT Local E2E School";
export const E2E_FIXTURE_ADMIN_EMAIL = "admin.e2e@dat.local";
export const E2E_FIXTURE_INSTRUCTOR_EMAIL = "instructor.e2e@dat.local";
export const E2E_FIXTURE_STUDENT_1_EMAIL = "student1.e2e@dat.local";
export const E2E_FIXTURE_STUDENT_2_EMAIL = "student2.e2e@dat.local";

export const E2E_FIXTURE_ADMIN_PASSWORD = "E2eLocal!Admin1";
export const E2E_FIXTURE_INSTRUCTOR_PASSWORD = "E2eLocal!Instr1";
export const E2E_FIXTURE_STUDENT_PASSWORD = "E2eLocal!Stud1";

export const E2E_FIXTURE_VEHICLE_MANAGEMENT_ENABLED = false;
export const E2E_FIXTURE_CATEGORY_NAME = "B";

const BCRYPT_ROUNDS = 12;
const INSTRUCTOR_LICENSE_NUMBER = "E2E-INS-0001";
const INSTRUCTOR_LICENSE_EXPIRY = new Date("2099-12-31T00:00:00.000Z");

export type E2eFixtureSafeSummary = {
  organizationId: string;
  adminUserId: string;
  instructorUserId: string;
  instructorRowId: string;
  student1Id: string;
  student2Id: string;
  student1UserId: string;
  student2UserId: string;
  vehicleManagementEnabled: boolean;
};

export function buildE2eFixtureSafeSummary(): E2eFixtureSafeSummary {
  return {
    organizationId: E2E_FIXTURE_ORG_ID,
    adminUserId: E2E_FIXTURE_ADMIN_USER_ID,
    instructorUserId: E2E_FIXTURE_INSTRUCTOR_USER_ID,
    instructorRowId: E2E_FIXTURE_INSTRUCTOR_ROW_ID,
    student1Id: E2E_FIXTURE_STUDENT_1_ID,
    student2Id: E2E_FIXTURE_STUDENT_2_ID,
    student1UserId: E2E_FIXTURE_STUDENT_1_USER_ID,
    student2UserId: E2E_FIXTURE_STUDENT_2_USER_ID,
    vehicleManagementEnabled: E2E_FIXTURE_VEHICLE_MANAGEMENT_ENABLED,
  };
}

export function formatE2eFixtureSafeSummary(
  summary: E2eFixtureSafeSummary = buildE2eFixtureSafeSummary(),
): string {
  return [
    "Disposable browser-E2E fixtures",
    `organizationId=${summary.organizationId}`,
    `adminUserId=${summary.adminUserId}`,
    `instructorUserId=${summary.instructorUserId}`,
    `instructorRowId=${summary.instructorRowId}`,
    `student1Id=${summary.student1Id}`,
    `student2Id=${summary.student2Id}`,
    `vehicleManagementEnabled=${summary.vehicleManagementEnabled}`,
  ].join("\n");
}

async function upsertVerifiedUser(
  prisma: PrismaClient,
  input: {
    id: string;
    email: string;
    passwordHash: string;
    role: "SUPER_ADMIN" | "INSTRUCTOR" | "STUDENT";
    firstName: string;
    lastName: string;
  },
): Promise<void> {
  const verifiedAt = new Date("2020-01-01T00:00:00.000Z");
  await prisma.user.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      firstName: input.firstName,
      lastName: input.lastName,
      organizationId: E2E_FIXTURE_ORG_ID,
      isEmailVerified: true,
      emailVerified: verifiedAt,
      isApproved: true,
    },
    update: {
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      firstName: input.firstName,
      lastName: input.lastName,
      organizationId: E2E_FIXTURE_ORG_ID,
      isEmailVerified: true,
      emailVerified: verifiedAt,
      isApproved: true,
    },
  });
}

export async function provisionE2eFixtures(
  prisma: PrismaClient,
): Promise<E2eFixtureSafeSummary> {
  const adminHash = await bcrypt.hash(
    E2E_FIXTURE_ADMIN_PASSWORD,
    BCRYPT_ROUNDS,
  );
  const instructorHash = await bcrypt.hash(
    E2E_FIXTURE_INSTRUCTOR_PASSWORD,
    BCRYPT_ROUNDS,
  );
  const studentHash = await bcrypt.hash(
    E2E_FIXTURE_STUDENT_PASSWORD,
    BCRYPT_ROUNDS,
  );

  await prisma.organization.upsert({
    where: { id: E2E_FIXTURE_ORG_ID },
    create: {
      id: E2E_FIXTURE_ORG_ID,
      name: E2E_FIXTURE_ORG_NAME,
      email: E2E_FIXTURE_ADMIN_EMAIL,
      isActive: true,
      isDemo: false,
      subscriptionStatus: "ACTIVE",
      subscriptionTier: "BASE",
    },
    update: {
      name: E2E_FIXTURE_ORG_NAME,
      isActive: true,
      isDemo: false,
      subscriptionStatus: "ACTIVE",
    },
  });

  const categoryB = await prisma.category.upsert({
    where: { name: E2E_FIXTURE_CATEGORY_NAME },
    create: {
      name: E2E_FIXTURE_CATEGORY_NAME,
      fullName: "Car",
      description: "Disposable E2E category B",
      isActive: true,
      displayOrder: 1,
    },
    update: {
      isActive: true,
    },
  });

  await prisma.organizationFeature.upsert({
    where: {
      organizationId_featureKey: {
        organizationId: E2E_FIXTURE_ORG_ID,
        featureKey: "VEHICLE_MANAGEMENT",
      },
    },
    create: {
      organizationId: E2E_FIXTURE_ORG_ID,
      featureKey: "VEHICLE_MANAGEMENT",
      isEnabled: E2E_FIXTURE_VEHICLE_MANAGEMENT_ENABLED,
    },
    update: {
      isEnabled: E2E_FIXTURE_VEHICLE_MANAGEMENT_ENABLED,
    },
  });

  await upsertVerifiedUser(prisma, {
    id: E2E_FIXTURE_ADMIN_USER_ID,
    email: E2E_FIXTURE_ADMIN_EMAIL,
    passwordHash: adminHash,
    role: "SUPER_ADMIN",
    firstName: "E2E",
    lastName: "Admin",
  });

  await upsertVerifiedUser(prisma, {
    id: E2E_FIXTURE_INSTRUCTOR_USER_ID,
    email: E2E_FIXTURE_INSTRUCTOR_EMAIL,
    passwordHash: instructorHash,
    role: "INSTRUCTOR",
    firstName: "E2E",
    lastName: "Instructor",
  });

  await prisma.instructor.upsert({
    where: { id: E2E_FIXTURE_INSTRUCTOR_ROW_ID },
    create: {
      id: E2E_FIXTURE_INSTRUCTOR_ROW_ID,
      userId: E2E_FIXTURE_INSTRUCTOR_USER_ID,
      organizationId: E2E_FIXTURE_ORG_ID,
      instructorLicenseNumber: INSTRUCTOR_LICENSE_NUMBER,
      instructorLicenseExpiry: INSTRUCTOR_LICENSE_EXPIRY,
      employmentType: "FULL_TIME",
      isAvailableForBooking: true,
      qualifiedCategories: {
        connect: [{ id: categoryB.id }],
      },
    },
    update: {
      userId: E2E_FIXTURE_INSTRUCTOR_USER_ID,
      organizationId: E2E_FIXTURE_ORG_ID,
      instructorLicenseNumber: INSTRUCTOR_LICENSE_NUMBER,
      instructorLicenseExpiry: INSTRUCTOR_LICENSE_EXPIRY,
      isAvailableForBooking: true,
      qualifiedCategories: {
        set: [{ id: categoryB.id }],
      },
    },
  });

  await upsertVerifiedUser(prisma, {
    id: E2E_FIXTURE_STUDENT_1_USER_ID,
    email: E2E_FIXTURE_STUDENT_1_EMAIL,
    passwordHash: studentHash,
    role: "STUDENT",
    firstName: "E2E",
    lastName: "Student One",
  });

  await upsertVerifiedUser(prisma, {
    id: E2E_FIXTURE_STUDENT_2_USER_ID,
    email: E2E_FIXTURE_STUDENT_2_EMAIL,
    passwordHash: studentHash,
    role: "STUDENT",
    firstName: "E2E",
    lastName: "Student Two",
  });

  await prisma.student.upsert({
    where: { id: E2E_FIXTURE_STUDENT_1_ID },
    create: {
      id: E2E_FIXTURE_STUDENT_1_ID,
      userId: E2E_FIXTURE_STUDENT_1_USER_ID,
      organizationId: E2E_FIXTURE_ORG_ID,
      firstName: "E2E",
      lastName: "Student One",
      email: E2E_FIXTURE_STUDENT_1_EMAIL,
      schoolStudentId: "26001",
      schoolStudentYearSuffix: "26",
      schoolStudentSequence: 1,
      schoolStudentIdSource: "MANUAL",
      appAccessMode: "APP_USER",
      categoryId: categoryB.id,
    },
    update: {
      userId: E2E_FIXTURE_STUDENT_1_USER_ID,
      organizationId: E2E_FIXTURE_ORG_ID,
      firstName: "E2E",
      lastName: "Student One",
      email: E2E_FIXTURE_STUDENT_1_EMAIL,
      appAccessMode: "APP_USER",
      categoryId: categoryB.id,
    },
  });

  await prisma.student.upsert({
    where: { id: E2E_FIXTURE_STUDENT_2_ID },
    create: {
      id: E2E_FIXTURE_STUDENT_2_ID,
      userId: E2E_FIXTURE_STUDENT_2_USER_ID,
      organizationId: E2E_FIXTURE_ORG_ID,
      firstName: "E2E",
      lastName: "Student Two",
      email: E2E_FIXTURE_STUDENT_2_EMAIL,
      schoolStudentId: "26002",
      schoolStudentYearSuffix: "26",
      schoolStudentSequence: 2,
      schoolStudentIdSource: "MANUAL",
      appAccessMode: "APP_USER",
      categoryId: categoryB.id,
    },
    update: {
      userId: E2E_FIXTURE_STUDENT_2_USER_ID,
      organizationId: E2E_FIXTURE_ORG_ID,
      firstName: "E2E",
      lastName: "Student Two",
      email: E2E_FIXTURE_STUDENT_2_EMAIL,
      appAccessMode: "APP_USER",
      categoryId: categoryB.id,
    },
  });

  return buildE2eFixtureSafeSummary();
}
