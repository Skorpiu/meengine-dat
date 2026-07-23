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
  type SmokeFixturesReconcileDb,
} from "@/lib/ops/production-smoke-fixtures-reconciliation";
import { formatSmokeFixturesReconcilePlanText } from "@/lib/ops/production-smoke-fixtures-reconciliation-output";
import { CANONICAL_SMOKE_ORGANIZATION_NAME } from "@/lib/ops/production-smoke-reconciliation-inspection";

const ORG_ID = "orgsmoke1abcdefghijklmnop";

function baseOrg() {
  return {
    id: ORG_ID,
    name: CANONICAL_SMOKE_ORGANIZATION_NAME,
    isActive: true,
    isDemo: false,
  };
}

function makeDb(
  overrides: Partial<SmokeFixturesReconcileDb> = {},
): SmokeFixturesReconcileDb {
  const zeroCount = vi.fn().mockResolvedValue(0);
  const emptyFindMany = vi.fn().mockResolvedValue([]);
  const upsert = vi.fn().mockResolvedValue({});
  const update = vi.fn().mockResolvedValue({});
  const create = vi.fn().mockResolvedValue({ id: "audit1" });

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
      findMany: vi.fn().mockResolvedValue([
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
      ]),
    },
    student: {
      findMany: vi.fn().mockResolvedValue([
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
            isApproved: true,
            isEmailVerified: true,
          },
        },
      ]),
      update,
    },
    vehicle: {
      findMany: vi.fn().mockResolvedValue([
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
      ]),
      update,
    },
    userInvitation: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "inv002aaaaaaaaaa",
          email: "sarah.williams@drivingschool.com",
          role: "INSTRUCTOR",
          status: "ACCEPTED",
          acceptedUserId: "userinstr002bbbbbb",
          studentId: null,
          acceptedAt: new Date(),
        },
        {
          id: "invstud2aaaaaaaa",
          email: "bob.wilson@email.com",
          role: "STUDENT",
          status: "ACCEPTED",
          acceptedUserId: "userstud002bbbbbbb",
          studentId: "stud002bbbbbbbbbb",
          acceptedAt: new Date(),
        },
      ]),
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
  return makeDb({
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
          id: "instr002bbbbbbbb",
          userId: "userinstr002bbbbbb",
          instructorLicenseNumber: "INS-002-2024",
          isAvailableForBooking: true,
          instructorLicenseExpiry: new Date("2099-12-31"),
          user: {
            id: "userinstr002bbbbbb",
            email: "smoke.instructor2@drivingschool.com",
            firstName: "Smoke",
            lastName: "Instructor 2",
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
            isApproved: true,
            isEmailVerified: true,
          },
        },
        {
          id: "stud002bbbbbbbbbb",
          userId: "userstud002bbbbbbb",
          firstName: "Smoke",
          lastName: "Student 2",
          email: "smoke.student2@email.com",
          studentIdNumber: "STU-002-2024",
          appAccessMode: "APP_USER",
          category: { id: 2, name: "B" },
          user: {
            id: "userstud002bbbbbbb",
            email: "smoke.student2@email.com",
            firstName: "Smoke",
            lastName: "Student 2",
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
      findMany: vi.fn().mockResolvedValue([
        {
          id: "inv002aaaaaaaaaa",
          email: "smoke.instructor2@drivingschool.com",
          role: "INSTRUCTOR",
          status: "ACCEPTED",
          acceptedUserId: "userinstr002bbbbbb",
          studentId: null,
          acceptedAt: new Date(),
        },
        {
          id: "invstud2aaaaaaaa",
          email: "smoke.student2@email.com",
          role: "STUDENT",
          status: "ACCEPTED",
          acceptedUserId: "userstud002bbbbbbb",
          studentId: "stud002bbbbbbbbbb",
          acceptedAt: new Date(),
        },
      ]),
    },
    auditLog: { create: auditCreate },
    ...extras,
  });
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

  it("dry-run plans feature enables, renames, and plates without writes", async () => {
    const db = makeDb({
      organizationFeature: {
        findMany: vi.fn().mockResolvedValue(
          SMOKE_REQUIRED_FEATURE_KEYS.map((featureKey) => ({
            featureKey,
            isEnabled: false,
          })),
        ),
        upsert: vi.fn(),
      },
    });

    const result = await planProductionSmokeFixturesReconciliation(db, {
      apply: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.applied).toBe(false);
    expect(result.plan.mode).toBe("dry-run");
    expect(result.plan.features.every((f) => f.action === "enable")).toBe(true);
    expect(result.plan.vehicles.map((v) => v.toRegistration)).toEqual(
      CANONICAL_SMOKE_VEHICLES.map((v) => v.registrationNumber),
    );
    expect(result.plan.vehicles.some((v) => v.negative)).toBe(true);
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
      { apply: false },
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
      { apply: false },
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
      { apply: false },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("unexpected_additional_organizations");
    }
  });

  it("selects canonical School Admin by exact identity and preserves John Doe", async () => {
    const result = await planProductionSmokeFixturesReconciliation(makeDb(), {
      apply: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.canonicalSchoolAdmin.displayName).toBe("Smoke Admin");
    expect(
      result.plan.additionalSchoolAdmins.some(
        (a) => a.displayName === "John Doe",
      ),
    ).toBe(true);
    expect(
      result.plan.additionalSchoolAdmins.find(
        (a) => a.displayName === "John Doe",
      )?.preserved,
    ).toBe(true);
  });

  it("observes invite vs unknown provenance (never invents remote manual)", async () => {
    const result = await planProductionSmokeFixturesReconciliation(makeDb(), {
      apply: false,
    });
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
    const text = formatSmokeFixturesReconcilePlanText(result.plan);
    expect(text).toContain("mode=dry-run");
  });

  it("apply enables features, renames fixtures, normalizes plates, and writes audit once", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const userUpdate = vi.fn().mockResolvedValue({});
    const studentUpdate = vi.fn().mockResolvedValue({});
    const vehicleUpdate = vi.fn().mockResolvedValue({});
    const auditCreate = vi.fn().mockResolvedValue({ id: "a1" });
    const base = makeDb();

    const db = makeDb({
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
    });

    const applied = await planProductionSmokeFixturesReconciliation(db, {
      apply: true,
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.applied).toBe(true);
    expect(applied.plan.mode).toBe("apply");
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
      { apply: true },
    );
    expect(idempotent.ok).toBe(true);
    if (!idempotent.ok) return;
    expect(idempotent.plan.features.every((f) => f.action === "noop")).toBe(
      true,
    );
    expect(idempotent.plan.vehicles.every((v) => v.alreadyCanonical)).toBe(
      true,
    );
    expect(idempotent.changesApplied).toBe(0);
    expect(canonicalDb.organizationFeature.upsert).not.toHaveBeenCalled();
    expect(canonicalDb.vehicle.update).not.toHaveBeenCalled();
    expect(canonicalDb.auditLog.create).not.toHaveBeenCalled();
  });

  it("refuses instructor destination name collision", async () => {
    const base = makeDb();
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
      makeDb({
        instructor: { findMany: vi.fn().mockResolvedValue(withCollider) },
      }),
      { apply: false },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("fixture_resolution_failed");
      expect(result.plan?.blockers).toContain(
        "destination_name_collision:instructor:Smoke Instructor 1",
      );
    }
  });

  it("refuses student destination name collision", async () => {
    const base = makeDb();
    const students = await base.student.findMany({
      where: { organizationId: ORG_ID },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        studentIdNumber: true,
        appAccessMode: true,
        category: { select: { id: true, name: true } },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isApproved: true,
            isEmailVerified: true,
          },
        },
      },
    });
    const withCollider = [
      ...students,
      {
        id: "stud999colliderxx",
        userId: null,
        firstName: "Smoke",
        lastName: "Student 1",
        email: "collider.student@email.com",
        studentIdNumber: "STU-999-2024",
        appAccessMode: "MANUAL_ONLY",
        category: { id: 2, name: "B" },
        user: null,
      },
    ];
    const result = await planProductionSmokeFixturesReconciliation(
      makeDb({
        student: {
          findMany: vi.fn().mockResolvedValue(withCollider),
          update: vi.fn(),
        },
      }),
      { apply: false },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.plan?.blockers).toContain(
        "destination_name_collision:student:Smoke Student 1",
      );
    }
  });

  it("refuses destination plate collision", async () => {
    const base = makeDb();
    const vehicles = await base.vehicle.findMany({
      where: { organizationId: ORG_ID },
      select: {
        id: true,
        registrationNumber: true,
        status: true,
        isActive: true,
        underMaintenance: true,
        category: { select: { id: true, name: true } },
      },
    });
    const withCollider = [
      ...vehicles,
      {
        id: 99,
        registrationNumber: "01-DS-24",
        status: "AVAILABLE",
        isActive: true,
        underMaintenance: false,
        category: { id: 2, name: "B" },
      },
    ];
    const result = await planProductionSmokeFixturesReconciliation(
      makeDb({
        vehicle: {
          findMany: vi.fn().mockResolvedValue(withCollider),
          update: vi.fn(),
        },
      }),
      { apply: false },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.plan?.blockers).toContain(
        "destination_plate_collision:01-DS-24",
      );
    }
  });

  it("refuses multiple candidates for the same legacy license", async () => {
    const base = makeDb();
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
    const duplicated = [
      ...instructors,
      {
        ...instructors[0]!,
        id: "instr001duplicatee",
        userId: "userinstr001dupaaa",
        user: {
          ...instructors[0]!.user,
          id: "userinstr001dupaaa",
          email: "michael.johnson.dup@drivingschool.com",
        },
      },
    ];
    const result = await planProductionSmokeFixturesReconciliation(
      makeDb({
        instructor: { findMany: vi.fn().mockResolvedValue(duplicated) },
      }),
      { apply: false },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.plan?.blockers).toContain("ambiguous_license:INS-001-2024");
    }
  });

  it("plans partially reconciled state (some already canonical)", async () => {
    const base = makeDb();
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
    const partial = instructors.map((row, idx) =>
      idx === 0
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
      makeDb({
        instructor: { findMany: vi.fn().mockResolvedValue(partial) },
      }),
      { apply: false },
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
    const db = makeDb({
      organizationFeature: {
        findMany: vi.fn().mockResolvedValue(
          SMOKE_REQUIRED_FEATURE_KEYS.map((featureKey) => ({
            featureKey,
            isEnabled: false,
          })),
        ),
        upsert: failingUpsert,
      },
    });

    const result = await planProductionSmokeFixturesReconciliation(db, {
      apply: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("apply_failed");
  });

  it("sanitized output omits full emails and ids", async () => {
    const result = await planProductionSmokeFixturesReconciliation(makeDb(), {
      apply: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const text = formatSmokeFixturesReconcilePlanText(result.plan);
    expect(text).not.toContain("admin@example.com");
    expect(text).not.toContain(ORG_ID);
    expect(text).not.toContain("michael.johnson@drivingschool.com");
    expect(text).toContain("Smoke Instructor Non-B");
    expect(text).toContain("03-DS-24");
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
    expect(service).not.toContain(
      "20260714160000_platform_commercial_catalog_schema_foundation_v1",
    );
    expect(service).not.toContain("deleteMany");
    expect(cli).toContain("assertRemoteOperatorTargetAllowed");
    expect(cli).toContain("--env-file");
    expect(cli).toContain("--apply");
    expect(cli).not.toContain("dotenv.config");
    expect(pkg).toContain(
      "node --env-file=.env.operator.production.local --import tsx scripts/reconcile-production-smoke-fixtures.ts",
    );
  });
});
