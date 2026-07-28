import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CANONICAL_SMOKE_ADMIN,
  CANONICAL_SMOKE_VEHICLES,
  SMOKE_REQUIRED_FEATURE_KEYS,
} from "@/lib/ops/production-smoke-fixtures-canonical";
import {
  collectSmokeFixtureDestinationCollisions,
  enableSmokeOrganizationFeature,
  parseSmokeFixturesReconcileArgs,
  planProductionSmokeFixturesReconciliation,
  resolveInvitedInstructor,
  resolveInvitedStudent,
  type SmokeFixturesReconcileDb,
} from "@/lib/ops/production-smoke-fixtures-reconciliation";
import { formatSmokeFixturesReconcilePlanText } from "@/lib/ops/production-smoke-fixtures-reconciliation-output";
import { CANONICAL_SMOKE_ORGANIZATION_NAME } from "@/lib/ops/production-smoke-reconciliation-inspection";

const ORG_ID = "orgsmoke1abcdefghijklmnop";
const INVITED_INSTRUCTOR_EMAIL = "invited.instructor@example.com";
const INVITED_STUDENT_EMAIL = "invited.student@example.com";

const defaultPlanOptions = {
  invitedInstructorEmail: INVITED_INSTRUCTOR_EMAIL,
  invitedStudentEmail: INVITED_STUDENT_EMAIL,
};

function baseOrg() {
  return {
    id: ORG_ID,
    name: CANONICAL_SMOKE_ORGANIZATION_NAME,
    isActive: true,
    isDemo: false,
  };
}

function legacyInstructors() {
  return [
    {
      id: "instr001aaaaaaaa",
      userId: "userinstr001aaaaaa",
      instructorLicenseNumber: "INS-001-2024",
      isAvailableForBooking: true,
      instructorLicenseExpiry: new Date("2099-12-31"),
      user: {
        id: "userinstr001aaaaaa",
        email: "michael.johnson@drivingschool.com",
        firstName: "Michael",
        lastName: "Johnson",
        role: "INSTRUCTOR",
        isApproved: true,
        isEmailVerified: true,
      },
      qualifiedCategories: [{ id: 2, name: "B" }],
    },
    {
      id: "instr002bbbbbbbb",
      userId: "userinstr002bbbbbb",
      instructorLicenseNumber: "INS-002-2024",
      isAvailableForBooking: true,
      instructorLicenseExpiry: new Date("2099-12-31"),
      user: {
        id: "userinstr002bbbbbb",
        email: "sarah.williams@drivingschool.com",
        firstName: "Sarah",
        lastName: "Williams",
        role: "INSTRUCTOR",
        isApproved: true,
        isEmailVerified: true,
      },
      qualifiedCategories: [{ id: 2, name: "B" }],
    },
    {
      id: "instr003cccccccc",
      userId: "userinstr003cccccc",
      instructorLicenseNumber: "INS-003-2024",
      isAvailableForBooking: true,
      instructorLicenseExpiry: new Date("2099-12-31"),
      user: {
        id: "userinstr003cccccc",
        email: "david.brown@drivingschool.com",
        firstName: "David",
        lastName: "Brown",
        role: "INSTRUCTOR",
        isApproved: true,
        isEmailVerified: true,
      },
      qualifiedCategories: [{ id: 3, name: "C" }],
    },
  ];
}

function invitedInstructorRow() {
  return {
    id: "instrinv2aaaaaaaa",
    userId: "userinstrinv2aaaaaa",
    instructorLicenseNumber: "INS-SMOKE-INVITE-2",
    isAvailableForBooking: true,
    instructorLicenseExpiry: new Date("2099-12-31"),
    user: {
      id: "userinstrinv2aaaaaa",
      email: INVITED_INSTRUCTOR_EMAIL,
      firstName: "Pending",
      lastName: "Instructor Two",
      role: "INSTRUCTOR",
      isApproved: true,
      isEmailVerified: true,
    },
    qualifiedCategories: [{ id: 2, name: "B" }],
  };
}

function legacyStudents() {
  return [
    {
      id: "stud001aaaaaaaaaa",
      userId: "userstud001aaaaaaa",
      firstName: null,
      lastName: null,
      email: null,
      studentIdNumber: "STU-001-2024",
      appAccessMode: "APP_USER",
      category: { id: 2, name: "B" },
      user: {
        id: "userstud001aaaaaaa",
        email: "alice.smith@email.com",
        firstName: "Alice",
        lastName: "Smith",
        role: "STUDENT",
        isApproved: true,
        isEmailVerified: true,
      },
    },
    {
      id: "stud002bbbbbbbbbb",
      userId: "userstud002bbbbbbb",
      firstName: null,
      lastName: null,
      email: null,
      studentIdNumber: "STU-002-2024",
      appAccessMode: "APP_USER",
      category: { id: 2, name: "B" },
      user: {
        id: "userstud002bbbbbbb",
        email: "bob.wilson@email.com",
        firstName: "Bob",
        lastName: "Wilson",
        role: "STUDENT",
        isApproved: true,
        isEmailVerified: true,
      },
    },
    {
      id: "stud003cccccccccc",
      userId: "userstud003ccccccc",
      firstName: null,
      lastName: null,
      email: null,
      studentIdNumber: "STU-003-2024",
      appAccessMode: "APP_USER",
      category: { id: 1, name: "A1" },
      user: {
        id: "userstud003ccccccc",
        email: "carol.davis@email.com",
        firstName: "Carol",
        lastName: "Davis",
        role: "STUDENT",
        isApproved: true,
        isEmailVerified: true,
      },
    },
  ];
}

function invitedStudentRow() {
  return {
    id: "studinv2bbbbbbbbbb",
    userId: "userstudinv2bbbbbb",
    firstName: null,
    lastName: null,
    email: null,
    studentIdNumber: "STU-SMOKE-INVITE-2",
    appAccessMode: "APP_USER",
    category: { id: 2, name: "B" },
    user: {
      id: "userstudinv2bbbbbb",
      email: INVITED_STUDENT_EMAIL,
      firstName: "Pending",
      lastName: "Student Two",
      role: "STUDENT",
      isApproved: true,
      isEmailVerified: true,
    },
  };
}

function invitedInvitations() {
  return [
    {
      id: "invinst2accepted",
      email: INVITED_INSTRUCTOR_EMAIL,
      role: "INSTRUCTOR",
      status: "ACCEPTED",
      acceptedUserId: "userinstrinv2aaaaaa",
      studentId: null,
      acceptedAt: new Date(),
    },
    {
      id: "invstud2accepted",
      email: INVITED_STUDENT_EMAIL,
      role: "STUDENT",
      status: "ACCEPTED",
      acceptedUserId: "userstudinv2bbbbbb",
      studentId: "studinv2bbbbbbbbbb",
      acceptedAt: new Date(),
    },
  ];
}

function legacyVehicles() {
  return [
    {
      id: 11,
      registrationNumber: "DS-001-2024",
      status: "AVAILABLE",
      isActive: true,
      underMaintenance: false,
      category: { id: 2, name: "B" },
    },
    {
      id: 12,
      registrationNumber: "DS-002-2024",
      status: "AVAILABLE",
      isActive: true,
      underMaintenance: false,
      category: { id: 2, name: "B" },
    },
    {
      id: 13,
      registrationNumber: "DS-003-2024",
      status: "AVAILABLE",
      isActive: true,
      underMaintenance: false,
      category: { id: 1, name: "A1" },
    },
    {
      id: 14,
      registrationNumber: "DS-004-2024",
      status: "AVAILABLE",
      isActive: true,
      underMaintenance: false,
      category: { id: 2, name: "B" },
    },
    {
      id: 15,
      registrationNumber: "DS-005-2024",
      status: "AVAILABLE",
      isActive: true,
      underMaintenance: false,
      category: { id: 2, name: "B" },
    },
  ];
}

function makeDb(
  overrides: Partial<SmokeFixturesReconcileDb> = {},
  includeInvitedFixtures = false,
): SmokeFixturesReconcileDb {
  const zeroCount = vi.fn().mockResolvedValue(0);
  const emptyFindMany = vi.fn().mockResolvedValue([]);
  const upsert = vi.fn().mockResolvedValue({});
  const update = vi.fn().mockResolvedValue({});
  const create = vi.fn().mockResolvedValue({ id: "audit1" });

  const instructors = includeInvitedFixtures
    ? [...legacyInstructors(), invitedInstructorRow()]
    : legacyInstructors();
  const students = includeInvitedFixtures
    ? [...legacyStudents(), invitedStudentRow()]
    : legacyStudents();
  const invitations = includeInvitedFixtures ? invitedInvitations() : [];

  const db: SmokeFixturesReconcileDb = {
    organization: {
      findMany: vi.fn().mockResolvedValue([baseOrg()]),
      count: zeroCount,
    },
    organizationFeature: {
      findMany: emptyFindMany,
      upsert,
    },
    user: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "adminsmokeuser0001",
          email: "admin@example.com",
          role: "SUPER_ADMIN",
          firstName: CANONICAL_SMOKE_ADMIN.firstName,
          lastName: CANONICAL_SMOKE_ADMIN.lastName,
          isApproved: true,
          isEmailVerified: true,
        },
        {
          id: "johndoeuser0000001",
          email: "john@doe.com",
          role: "SUPER_ADMIN",
          firstName: "John",
          lastName: "Doe",
          isApproved: true,
          isEmailVerified: true,
        },
      ]),
      update,
    },
    instructor: {
      findMany: vi.fn().mockResolvedValue(instructors),
    },
    student: {
      findMany: vi.fn().mockResolvedValue(students),
      update,
    },
    vehicle: {
      findMany: vi.fn().mockResolvedValue(legacyVehicles()),
      update,
    },
    userInvitation: {
      findMany: vi.fn().mockResolvedValue(invitations),
    },
    auditLog: { create },
    $transaction: async (fn) => fn(db),
    ...overrides,
  };

  if (!overrides.$transaction) {
    db.$transaction = async (fn) => fn(db);
  }

  return db;
}

function makeFullyCanonicalDb(
  extras: Partial<SmokeFixturesReconcileDb> = {},
): SmokeFixturesReconcileDb {
  const upsert = vi.fn();
  const vehicleUpdate = vi.fn();
  const auditCreate = vi.fn().mockResolvedValue({ id: "a1" });
  return makeDb(
    {
      organizationFeature: {
        findMany: vi.fn().mockResolvedValue(
          SMOKE_REQUIRED_FEATURE_KEYS.map((featureKey) => ({
            featureKey,
            isEnabled: true,
          })),
        ),
        upsert,
      },
      instructor: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "instr001aaaaaaaa",
            userId: "userinstr001aaaaaa",
            instructorLicenseNumber: "INS-001-2024",
            isAvailableForBooking: true,
            instructorLicenseExpiry: new Date("2099-12-31"),
            user: {
              id: "userinstr001aaaaaa",
              email: "smoke.instructor1@drivingschool.com",
              firstName: "Smoke",
              lastName: "Instructor 1",
              role: "INSTRUCTOR",
              isApproved: true,
              isEmailVerified: true,
            },
            qualifiedCategories: [{ id: 2, name: "B" }],
          },
          {
            id: "instrinv2aaaaaaaa",
            userId: "userinstrinv2aaaaaa",
            instructorLicenseNumber: "INS-SMOKE-INVITE-2",
            isAvailableForBooking: true,
            instructorLicenseExpiry: new Date("2099-12-31"),
            user: {
              id: "userinstrinv2aaaaaa",
              email: INVITED_INSTRUCTOR_EMAIL,
              firstName: "Smoke",
              lastName: "Instructor 2",
              role: "INSTRUCTOR",
              isApproved: true,
              isEmailVerified: true,
            },
            qualifiedCategories: [{ id: 2, name: "B" }],
          },
          {
            id: "instr002bbbbbbbb",
            userId: "userinstr002bbbbbb",
            instructorLicenseNumber: "INS-002-2024",
            isAvailableForBooking: true,
            instructorLicenseExpiry: new Date("2099-12-31"),
            user: {
              id: "userinstr002bbbbbb",
              email: "sarah.williams@drivingschool.com",
              firstName: "Sarah",
              lastName: "Williams",
              role: "INSTRUCTOR",
              isApproved: true,
              isEmailVerified: true,
            },
            qualifiedCategories: [{ id: 2, name: "B" }],
          },
          {
            id: "instr003cccccccc",
            userId: "userinstr003cccccc",
            instructorLicenseNumber: "INS-003-2024",
            isAvailableForBooking: true,
            instructorLicenseExpiry: new Date("2099-12-31"),
            user: {
              id: "userinstr003cccccc",
              email: "smoke.instructor.nonb@drivingschool.com",
              firstName: "Smoke",
              lastName: "Instructor Non-B",
              role: "INSTRUCTOR",
              isApproved: true,
              isEmailVerified: true,
            },
            qualifiedCategories: [{ id: 3, name: "C" }],
          },
        ]),
      },
      student: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "stud001aaaaaaaaaa",
            userId: "userstud001aaaaaaa",
            firstName: "Smoke",
            lastName: "Student 1",
            email: "smoke.student1@email.com",
            studentIdNumber: "STU-001-2024",
            appAccessMode: "APP_USER",
            category: { id: 2, name: "B" },
            user: {
              id: "userstud001aaaaaaa",
              email: "smoke.student1@email.com",
              firstName: "Smoke",
              lastName: "Student 1",
              role: "STUDENT",
              isApproved: true,
              isEmailVerified: true,
            },
          },
          {
            id: "studinv2bbbbbbbbbb",
            userId: "userstudinv2bbbbbb",
            firstName: "Smoke",
            lastName: "Student 2",
            email: INVITED_STUDENT_EMAIL,
            studentIdNumber: "STU-SMOKE-INVITE-2",
            appAccessMode: "APP_USER",
            category: { id: 2, name: "B" },
            user: {
              id: "userstudinv2bbbbbb",
              email: INVITED_STUDENT_EMAIL,
              firstName: "Smoke",
              lastName: "Student 2",
              role: "STUDENT",
              isApproved: true,
              isEmailVerified: true,
            },
          },
          {
            id: "stud002bbbbbbbbbb",
            userId: "userstud002bbbbbbb",
            firstName: "Bob",
            lastName: "Wilson",
            email: "bob.wilson@email.com",
            studentIdNumber: "STU-002-2024",
            appAccessMode: "APP_USER",
            category: { id: 2, name: "B" },
            user: {
              id: "userstud002bbbbbbb",
              email: "bob.wilson@email.com",
              firstName: "Bob",
              lastName: "Wilson",
              role: "STUDENT",
              isApproved: true,
              isEmailVerified: true,
            },
          },
          {
            id: "stud003cccccccccc",
            userId: "userstud003ccccccc",
            firstName: "Smoke",
            lastName: "Student A1",
            email: "smoke.student.a1@email.com",
            studentIdNumber: "STU-003-2024",
            appAccessMode: "APP_USER",
            category: { id: 1, name: "A1" },
            user: {
              id: "userstud003ccccccc",
              email: "smoke.student.a1@email.com",
              firstName: "Smoke",
              lastName: "Student A1",
              role: "STUDENT",
              isApproved: true,
              isEmailVerified: true,
            },
          },
        ]),
        update: vi.fn(),
      },
      vehicle: {
        findMany: vi.fn().mockResolvedValue(
          CANONICAL_SMOKE_VEHICLES.map((v, idx) => ({
            id: 20 + idx,
            registrationNumber: v.registrationNumber,
            status: "AVAILABLE",
            isActive: true,
            underMaintenance: false,
            category: {
              id: v.categoryName === "B" ? 2 : 1,
              name: v.categoryName,
            },
          })),
        ),
        update: vehicleUpdate,
      },
      userInvitation: {
        findMany: vi.fn().mockResolvedValue(invitedInvitations()),
      },
      auditLog: { create: auditCreate },
      ...extras,
    },
    true,
  );
}

describe("production-smoke-fixtures-reconciliation", () => {
  describe("parseSmokeFixturesReconcileArgs", () => {
    it("defaults to dry-run for [] and standalone --", () => {
      expect(parseSmokeFixturesReconcileArgs([])).toEqual({
        apply: false,
        unknownFlags: [],
      });
      expect(parseSmokeFixturesReconcileArgs(["--"])).toEqual({
        apply: false,
        unknownFlags: [],
      });
    });

    it("enables apply for --apply and pnpm-forwarded -- --apply", () => {
      expect(parseSmokeFixturesReconcileArgs(["--apply"])).toEqual({
        apply: true,
        unknownFlags: [],
      });
      expect(parseSmokeFixturesReconcileArgs(["--", "--apply"])).toEqual({
        apply: true,
        unknownFlags: [],
      });
    });

    it("rejects unknown args and duplicate --apply before any DB work", () => {
      expect(
        parseSmokeFixturesReconcileArgs(["--force"]).unknownFlags,
      ).toContain("--force");
      expect(parseSmokeFixturesReconcileArgs(["oops"]).unknownFlags).toContain(
        "oops",
      );
      expect(
        parseSmokeFixturesReconcileArgs(["--apply", "--apply"]).unknownFlags,
      ).toContain("--apply(duplicate)");
    });
  });

  it("blocks when both operator-only invite emails are missing and fixtures are not resolved", async () => {
    const result = await planProductionSmokeFixturesReconciliation(makeDb(), {
      apply: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.plan?.blockers).toContain(
        "invited_instructor_email_env_missing",
      );
      expect(result.plan?.blockers).toContain(
        "invited_student_email_env_missing",
      );
      expect(result.plan?.humanDecisionsRequired.length).toBeGreaterThan(0);
    }
  });

  it("blocks when invited instructor fixture is missing", async () => {
    const result = await planProductionSmokeFixturesReconciliation(makeDb(), {
      apply: false,
      ...defaultPlanOptions,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.plan?.blockers).toContain(
        "canonical_invited_instructor_missing",
      );
    }
  });

  it("blocks when invited student fixture is missing", async () => {
    const db = makeDb({}, true);
    const instructors = await db.instructor.findMany({
      where: { organizationId: ORG_ID },
      select: {
        id: true,
        userId: true,
        instructorLicenseNumber: true,
        isAvailableForBooking: true,
        instructorLicenseExpiry: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isApproved: true,
            isEmailVerified: true,
          },
        },
        qualifiedCategories: { select: { id: true, name: true } },
      },
    });
    const result = await planProductionSmokeFixturesReconciliation(
      makeDb({
        instructor: { findMany: vi.fn().mockResolvedValue(instructors) },
      }),
      { apply: false, ...defaultPlanOptions },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.plan?.blockers).toContain(
        "canonical_invited_student_missing",
      );
    }
  });

  it("does not accept PENDING, REVOKED, or EXPIRED invitations", async () => {
    const instructors = [...legacyInstructors(), invitedInstructorRow()];
    const students = [...legacyStudents(), invitedStudentRow()];
    const invitations = [
      {
        id: "pending",
        email: INVITED_INSTRUCTOR_EMAIL,
        role: "INSTRUCTOR",
        status: "PENDING",
        acceptedUserId: null,
        studentId: null,
        acceptedAt: null,
      },
      {
        id: "revoked",
        email: INVITED_STUDENT_EMAIL,
        role: "STUDENT",
        status: "REVOKED",
        acceptedUserId: null,
        studentId: "studinv2bbbbbbbbbb",
        acceptedAt: null,
      },
      {
        id: "expired",
        email: INVITED_STUDENT_EMAIL,
        role: "STUDENT",
        status: "EXPIRED",
        acceptedUserId: "userstudinv2bbbbbb",
        studentId: "studinv2bbbbbbbbbb",
        acceptedAt: null,
      },
    ];
    const result = await planProductionSmokeFixturesReconciliation(
      makeDb({
        instructor: { findMany: vi.fn().mockResolvedValue(instructors) },
        student: {
          findMany: vi.fn().mockResolvedValue(students),
          update: vi.fn(),
        },
        userInvitation: { findMany: vi.fn().mockResolvedValue(invitations) },
      }),
      { apply: false, ...defaultPlanOptions },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.plan?.blockers).toContain(
        "canonical_invited_instructor_missing",
      );
      expect(result.plan?.blockers).toContain(
        "canonical_invited_student_missing",
      );
    }
  });

  it("rejects ACCEPTED instructor invite with wrong acceptedUserId", () => {
    const instructors = [...legacyInstructors(), invitedInstructorRow()];
    const invitations = [
      {
        id: "bad",
        email: INVITED_INSTRUCTOR_EMAIL,
        role: "INSTRUCTOR",
        status: "ACCEPTED",
        acceptedUserId: "wrong-user-id",
        studentId: null,
        acceptedAt: new Date(),
      },
    ];
    const resolved = resolveInvitedInstructor(
      instructors,
      invitations,
      {
        key: "instructor2",
        firstName: "Smoke",
        lastName: "Instructor 2",
        displayName: "Smoke Instructor 2",
        intendedProvenance: "invite",
        resolution: "invite",
        requiresCategoryB: true,
      },
      { invitedInstructorEmail: INVITED_INSTRUCTOR_EMAIL },
    );
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) {
      expect(resolved.reason).toBe("canonical_invited_instructor_missing");
    }
  });

  it("rejects ACCEPTED student invite with wrong studentId", () => {
    const students = [...legacyStudents(), invitedStudentRow()];
    const invitations = [
      {
        id: "bad",
        email: INVITED_STUDENT_EMAIL,
        role: "STUDENT",
        status: "ACCEPTED",
        acceptedUserId: "userstudinv2bbbbbb",
        studentId: "wrong-student-id",
        acceptedAt: new Date(),
      },
    ];
    const resolved = resolveInvitedStudent(
      students,
      invitations,
      {
        key: "student2",
        firstName: "Smoke",
        lastName: "Student 2",
        displayName: "Smoke Student 2",
        intendedProvenance: "invite",
        resolution: "invite",
        categoryName: "B",
      },
      { invitedStudentEmail: INVITED_STUDENT_EMAIL },
    );
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) {
      expect(resolved.reason).toBe("canonical_invited_student_missing");
    }
  });

  it("rejects ACCEPTED invite when user role is wrong", () => {
    const wrongRoleInstructor = {
      ...invitedInstructorRow(),
      user: {
        ...invitedInstructorRow().user,
        role: "STUDENT",
      },
    };
    const resolved = resolveInvitedInstructor(
      [...legacyInstructors(), wrongRoleInstructor],
      invitedInvitations(),
      {
        key: "instructor2",
        firstName: "Smoke",
        lastName: "Instructor 2",
        displayName: "Smoke Instructor 2",
        intendedProvenance: "invite",
        resolution: "invite",
        requiresCategoryB: true,
      },
      { invitedInstructorEmail: INVITED_INSTRUCTOR_EMAIL },
    );
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) {
      expect(resolved.reason).toBe("invited_instructor_wrong_user_role");
    }
  });

  it("rejects ambiguous ACCEPTED invitations", () => {
    const invitations = [
      ...invitedInvitations(),
      {
        id: "dup-instructor",
        email: INVITED_INSTRUCTOR_EMAIL,
        role: "INSTRUCTOR",
        status: "ACCEPTED",
        acceptedUserId: "userinstrinv2aaaaaa",
        studentId: null,
        acceptedAt: new Date(),
      },
    ];
    const instructorResolved = resolveInvitedInstructor(
      [...legacyInstructors(), invitedInstructorRow()],
      invitations,
      {
        key: "instructor2",
        firstName: "Smoke",
        lastName: "Instructor 2",
        displayName: "Smoke Instructor 2",
        intendedProvenance: "invite",
        resolution: "invite",
        requiresCategoryB: true,
      },
      { invitedInstructorEmail: INVITED_INSTRUCTOR_EMAIL },
    );
    expect(instructorResolved.ok).toBe(false);
    if (!instructorResolved.ok) {
      expect(instructorResolved.reason).toBe(
        "ambiguous_accepted_invitation:instructor",
      );
    }

    const studentInvitations = [
      ...invitedInvitations(),
      {
        id: "dup-student",
        email: INVITED_STUDENT_EMAIL,
        role: "STUDENT",
        status: "ACCEPTED",
        acceptedUserId: "userstudinv2bbbbbb",
        studentId: "studinv2bbbbbbbbbb",
        acceptedAt: new Date(),
      },
    ];
    const studentResolved = resolveInvitedStudent(
      [...legacyStudents(), invitedStudentRow()],
      studentInvitations,
      {
        key: "student2",
        firstName: "Smoke",
        lastName: "Student 2",
        displayName: "Smoke Student 2",
        intendedProvenance: "invite",
        resolution: "invite",
        categoryName: "B",
      },
      { invitedStudentEmail: INVITED_STUDENT_EMAIL },
    );
    expect(studentResolved.ok).toBe(false);
    if (!studentResolved.ok) {
      expect(studentResolved.reason).toBe(
        "ambiguous_accepted_invitation:student",
      );
    }
  });

  it("resolves valid invited fixtures", async () => {
    const result = await planProductionSmokeFixturesReconciliation(
      makeDb({}, true),
      { apply: false, ...defaultPlanOptions },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.plan.instructors.find(
        (i) => i.displayName === "Smoke Instructor 2",
      )?.observedProvenance,
    ).toBe("invite");
    expect(
      result.plan.students.find((s) => s.displayName === "Smoke Student 2")
        ?.observedProvenance,
    ).toBe("invite");
  });

  it("preserves Sarah and Bob without renaming them to invite canonical names", async () => {
    const result = await planProductionSmokeFixturesReconciliation(
      makeDb({}, true),
      { apply: false, ...defaultPlanOptions },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.plan.additionalInstructors.some(
        (i) => i.displayName === "Sarah Williams" && i.preserved,
      ),
    ).toBe(true);
    expect(
      result.plan.additionalStudents.some(
        (s) => s.displayName === "Bob Wilson" && s.preserved,
      ),
    ).toBe(true);
    expect(
      result.plan.nameChanges.some(
        (c) =>
          c.fromDisplayName === "Sarah Williams" &&
          c.toDisplayName === "Smoke Instructor 2",
      ),
    ).toBe(false);
    expect(
      result.plan.nameChanges.some(
        (c) =>
          c.fromDisplayName === "Bob Wilson" &&
          c.toDisplayName === "Smoke Student 2",
      ),
    ).toBe(false);
  });

  it("refuses apply while invited fixtures are missing", async () => {
    const result = await planProductionSmokeFixturesReconciliation(makeDb(), {
      apply: true,
      ...defaultPlanOptions,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("fixture_resolution_failed");
      expect(result.plan?.mode).toBe("apply");
    }
  });

  it("dry-run plans feature enables, renames, and plates without writes", async () => {
    const db = makeDb(
      {
        organizationFeature: {
          findMany: vi.fn().mockResolvedValue(
            SMOKE_REQUIRED_FEATURE_KEYS.map((featureKey) => ({
              featureKey,
              isEnabled: false,
            })),
          ),
          upsert: vi.fn(),
        },
      },
      true,
    );

    const result = await planProductionSmokeFixturesReconciliation(db, {
      apply: false,
      ...defaultPlanOptions,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.applied).toBe(false);
    expect(result.plan.mode).toBe("dry-run");
    expect(result.plan.features.every((f) => f.action === "enable")).toBe(true);
    expect(result.plan.vehicles.map((v) => v.toRegistration)).toEqual(
      CANONICAL_SMOKE_VEHICLES.map((v) => v.registrationNumber),
    );
    expect(db.organizationFeature.upsert).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
    expect(db.vehicle.update).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it("refuses missing and ambiguous organizations", async () => {
    const missing = await planProductionSmokeFixturesReconciliation(
      makeDb({
        organization: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
      }),
      { apply: false, ...defaultPlanOptions },
    );
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.code).toBe("smoke_organization_missing");

    const ambiguous = await planProductionSmokeFixturesReconciliation(
      makeDb({
        organization: {
          findMany: vi.fn().mockResolvedValue([baseOrg(), baseOrg()]),
          count: vi.fn().mockResolvedValue(0),
        },
      }),
      { apply: false, ...defaultPlanOptions },
    );
    expect(ambiguous.ok).toBe(false);
    if (!ambiguous.ok) {
      expect(ambiguous.code).toBe("smoke_organization_ambiguous");
    }
  });

  it("refuses unexpected additional organizations", async () => {
    const result = await planProductionSmokeFixturesReconciliation(
      makeDb({
        organization: {
          findMany: vi.fn().mockResolvedValue([baseOrg()]),
          count: vi.fn().mockResolvedValue(2),
        },
      }),
      { apply: false, ...defaultPlanOptions },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("unexpected_additional_organizations");
    }
  });

  it("selects canonical School Admin by exact identity and preserves John Doe", async () => {
    const result = await planProductionSmokeFixturesReconciliation(
      makeDb({}, true),
      { apply: false, ...defaultPlanOptions },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.canonicalSchoolAdmin.displayName).toBe("Smoke Admin");
    expect(
      result.plan.additionalSchoolAdmins.some(
        (a) => a.displayName === "John Doe",
      ),
    ).toBe(true);
  });

  it("observes invite for invited fixtures and unknown for legacy manual fixtures", async () => {
    const result = await planProductionSmokeFixturesReconciliation(
      makeDb({}, true),
      { apply: false, ...defaultPlanOptions },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.plan.instructors.find(
        (i) => i.displayName === "Smoke Instructor 2",
      )?.observedProvenance,
    ).toBe("invite");
    expect(
      result.plan.instructors.find(
        (i) => i.displayName === "Smoke Instructor 1",
      )?.observedProvenance,
    ).toBe("unknown");
    expect(
      result.plan.students.find((s) => s.displayName === "Smoke Student 2")
        ?.observedProvenance,
    ).toBe("invite");
    expect(
      result.plan.students.find((s) => s.displayName === "Smoke Student 1")
        ?.observedProvenance,
    ).toBe("unknown");
    expect(
      result.plan.warnings.some((w) => w.startsWith("provenance_unknown:")),
    ).toBe(true);
    expect(
      result.plan.blockers.some((b) => b.startsWith("provenance_unknown")),
    ).toBe(false);
  });

  it("apply enables features, renames fixtures, normalizes plates, and writes audit once", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const userUpdate = vi.fn().mockResolvedValue({});
    const studentUpdate = vi.fn().mockResolvedValue({});
    const vehicleUpdate = vi.fn().mockResolvedValue({});
    const auditCreate = vi.fn().mockResolvedValue({ id: "a1" });
    const base = makeDb({}, true);

    const db = makeDb(
      {
        organizationFeature: {
          findMany: vi.fn().mockResolvedValue(
            SMOKE_REQUIRED_FEATURE_KEYS.map((featureKey) => ({
              featureKey,
              isEnabled: false,
            })),
          ),
          upsert,
        },
        user: {
          findMany: base.user.findMany,
          update: userUpdate,
        },
        student: {
          findMany: base.student.findMany,
          update: studentUpdate,
        },
        vehicle: {
          findMany: base.vehicle.findMany,
          update: vehicleUpdate,
        },
        auditLog: { create: auditCreate },
      },
      true,
    );

    const applied = await planProductionSmokeFixturesReconciliation(db, {
      apply: true,
      ...defaultPlanOptions,
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.applied).toBe(true);
    expect(upsert).toHaveBeenCalledTimes(3);
    expect(userUpdate).toHaveBeenCalled();
    expect(studentUpdate).toHaveBeenCalled();
    expect(vehicleUpdate).toHaveBeenCalledTimes(5);
    expect(auditCreate).toHaveBeenCalledTimes(1);
  });

  it("is idempotent when fixtures are already canonical (zero writes, no audit)", async () => {
    const canonicalDb = makeFullyCanonicalDb();
    const idempotent = await planProductionSmokeFixturesReconciliation(
      canonicalDb,
      { apply: true, ...defaultPlanOptions },
    );
    expect(idempotent.ok).toBe(true);
    if (!idempotent.ok) return;
    expect(idempotent.plan.features.every((f) => f.action === "noop")).toBe(
      true,
    );
    expect(idempotent.changesApplied).toBe(0);
    expect(canonicalDb.organizationFeature.upsert).not.toHaveBeenCalled();
    expect(canonicalDb.auditLog.create).not.toHaveBeenCalled();
  });

  it("refuses instructor destination name collision", async () => {
    const base = makeDb({}, true);
    const instructors = await base.instructor.findMany({
      where: { organizationId: ORG_ID },
      select: {
        id: true,
        userId: true,
        instructorLicenseNumber: true,
        isAvailableForBooking: true,
        instructorLicenseExpiry: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isApproved: true,
            isEmailVerified: true,
          },
        },
        qualifiedCategories: { select: { id: true, name: true } },
      },
    });
    const withCollider = [
      ...instructors,
      {
        id: "instr999collider",
        userId: "userinstr999cccccc",
        instructorLicenseNumber: "INS-999-2024",
        isAvailableForBooking: true,
        instructorLicenseExpiry: new Date("2099-12-31"),
        user: {
          id: "userinstr999cccccc",
          email: "collider@example.com",
          firstName: "Smoke",
          lastName: "Instructor 1",
          role: "INSTRUCTOR",
          isApproved: true,
          isEmailVerified: true,
        },
        qualifiedCategories: [{ id: 2, name: "B" }],
      },
    ];
    const result = await planProductionSmokeFixturesReconciliation(
      makeDb(
        {
          instructor: { findMany: vi.fn().mockResolvedValue(withCollider) },
        },
        true,
      ),
      { apply: false, ...defaultPlanOptions },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.plan?.blockers).toContain(
        "destination_name_collision:instructor:Smoke Instructor 1",
      );
    }
  });

  it("plans partially reconciled legacy state (some already canonical)", async () => {
    const base = makeDb({}, true);
    const instructors = await base.instructor.findMany({
      where: { organizationId: ORG_ID },
      select: {
        id: true,
        userId: true,
        instructorLicenseNumber: true,
        isAvailableForBooking: true,
        instructorLicenseExpiry: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isApproved: true,
            isEmailVerified: true,
          },
        },
        qualifiedCategories: { select: { id: true, name: true } },
      },
    });
    const partial = instructors.map((row) =>
      row.instructorLicenseNumber === "INS-001-2024"
        ? {
            ...row,
            user: {
              ...row.user,
              firstName: "Smoke",
              lastName: "Instructor 1",
            },
          }
        : row,
    );
    const result = await planProductionSmokeFixturesReconciliation(
      makeDb(
        {
          instructor: { findMany: vi.fn().mockResolvedValue(partial) },
        },
        true,
      ),
      { apply: false, ...defaultPlanOptions },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.plan.instructors.find(
        (i) => i.displayName === "Smoke Instructor 1",
      )?.alreadyCanonical,
    ).toBe(true);
    expect(
      result.plan.instructors.find(
        (i) => i.displayName === "Smoke Instructor 2",
      )?.alreadyCanonical,
    ).toBe(false);
  });

  it("collectSmokeFixtureDestinationCollisions is unit-tested for ownership", () => {
    expect(
      collectSmokeFixtureDestinationCollisions({
        instructors: [
          {
            id: "a",
            user: { firstName: "Smoke", lastName: "Instructor 1" },
          },
          {
            id: "b",
            user: { firstName: "Smoke", lastName: "Instructor 1" },
          },
        ],
        students: [],
        vehicles: [],
        resolvedInstructors: [
          {
            rowId: "a",
            firstName: "Smoke",
            lastName: "Instructor 1",
            displayName: "Smoke Instructor 1",
          },
        ],
        resolvedStudents: [],
        resolvedVehicles: [],
      }),
    ).toContain("destination_name_collision:instructor:Smoke Instructor 1");
  });

  it("rolls back when an apply operation fails", async () => {
    const failingUpsert = vi.fn().mockRejectedValue(new Error("boom"));
    const db = makeDb(
      {
        organizationFeature: {
          findMany: vi.fn().mockResolvedValue(
            SMOKE_REQUIRED_FEATURE_KEYS.map((featureKey) => ({
              featureKey,
              isEnabled: false,
            })),
          ),
          upsert: failingUpsert,
        },
      },
      true,
    );

    const result = await planProductionSmokeFixturesReconciliation(db, {
      apply: true,
      ...defaultPlanOptions,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("apply_failed");
  });

  it("sanitized output omits full emails and ids", async () => {
    const result = await planProductionSmokeFixturesReconciliation(
      makeDb({}, true),
      { apply: false, ...defaultPlanOptions },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const text = formatSmokeFixturesReconcilePlanText(result.plan);
    expect(text).not.toContain("admin@example.com");
    expect(text).not.toContain(ORG_ID);
    expect(text).not.toContain(INVITED_INSTRUCTOR_EMAIL);
    expect(text).toContain("Sarah Williams");
    expect(text).toContain("Bob Wilson");
    expect(text).toContain("Human decisions required");
    expect(text).toContain("mode=dry-run");
  });

  it("enableSmokeOrganizationFeature upserts enabled=true via LicenseService", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    await enableSmokeOrganizationFeature(
      { organizationFeature: { findMany: vi.fn(), upsert } },
      { organizationId: ORG_ID, featureKey: "LESSON_MANAGEMENT" },
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          featureKey: "LESSON_MANAGEMENT",
          isEnabled: true,
        }),
        update: expect.objectContaining({ isEnabled: true }),
      }),
    );
  });

  it("source contract: operator --env-file, no commercial migration, no PLATFORM_ADMIN restore", () => {
    const service = readFileSync(
      join(
        process.cwd(),
        "lib",
        "ops",
        "production-smoke-fixtures-reconciliation.ts",
      ),
      "utf8",
    );
    const cli = readFileSync(
      join(process.cwd(), "scripts", "reconcile-production-smoke-fixtures.ts"),
      "utf8",
    );
    const pkg = readFileSync(join(process.cwd(), "package.json"), "utf8");
    expect(service).not.toContain("PLATFORM_ADMIN");
    expect(service).not.toContain("commercialProduct");
    expect(cli).toContain("DAT_SMOKE_INVITED_INSTRUCTOR_EMAIL");
    expect(cli).toContain("DAT_SMOKE_INVITED_STUDENT_EMAIL");
    expect(cli).toContain("assertRemoteOperatorTargetAllowed");
    expect(cli).toContain("--env-file");
    expect(pkg).toContain(
      "node --env-file=.env.operator.production.local --import tsx scripts/reconcile-production-smoke-fixtures.ts",
    );
  });
});
