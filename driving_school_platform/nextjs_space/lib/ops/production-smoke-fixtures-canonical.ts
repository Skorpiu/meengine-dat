/**
 * Canonical fixture identities for the DAT technical smoke tenant.
 * Used by seed, reconcile, and inspection — never document real passwords or full IDs here.
 */

export const CANONICAL_SMOKE_ADMIN = {
  firstName: "Smoke",
  lastName: "Admin",
  displayName: "Smoke Admin",
} as const;

/** Extra School Admin left untouched (dependency audit required before any change). */
export const PRESERVED_EXTRA_ADMIN = {
  firstName: "John",
  lastName: "Doe",
  displayName: "John Doe",
} as const;

/**
 * Observed/intended fixture provenance.
 * - `invite`: observable ACCEPTED UserInvitation evidence only
 * - `manual`: deterministic known-manual context (e.g. local seed created by DAT seed)
 * - `unknown`: no observable invite and no explicit manual evidence (remote default)
 *
 * Remote reconcile must never invent `manual` merely because an invite row is absent.
 */
export type SmokeFixtureProvenance = "invite" | "manual" | "unknown";

export const CANONICAL_SMOKE_INSTRUCTORS = {
  instructor1: {
    key: "instructor1",
    firstName: "Smoke",
    lastName: "Instructor 1",
    displayName: "Smoke Instructor 1",
    /** Seed intent; remote observed provenance stays invite|unknown. */
    intendedProvenance: "manual" as const,
    requiresCategoryB: true,
    /** Deterministic seed identity keys (pre-rename). */
    legacyLicenseNumber: "INS-001-2024",
    legacyFirstName: "Michael",
    legacyLastName: "Johnson",
    legacyEmailLocalHint: "michael.johnson",
  },
  instructor2: {
    key: "instructor2",
    firstName: "Smoke",
    lastName: "Instructor 2",
    displayName: "Smoke Instructor 2",
    intendedProvenance: "invite" as const,
    requiresCategoryB: true,
    legacyLicenseNumber: "INS-002-2024",
    legacyFirstName: "Sarah",
    legacyLastName: "Williams",
    legacyEmailLocalHint: "sarah.williams",
  },
  instructorNonB: {
    key: "instructorNonB",
    firstName: "Smoke",
    lastName: "Instructor Non-B",
    displayName: "Smoke Instructor Non-B",
    intendedProvenance: "manual" as const,
    requiresCategoryB: false,
    legacyLicenseNumber: "INS-003-2024",
    legacyFirstName: "David",
    legacyLastName: "Brown",
    legacyEmailLocalHint: "david.brown",
  },
} as const;

export const CANONICAL_SMOKE_STUDENTS = {
  student1: {
    key: "student1",
    firstName: "Smoke",
    lastName: "Student 1",
    displayName: "Smoke Student 1",
    intendedProvenance: "manual" as const,
    categoryName: "B",
    legacyStudentIdNumber: "STU-001-2024",
    legacyFirstName: "Alice",
    legacyLastName: "Smith",
    legacyEmailLocalHint: "alice.smith",
  },
  student2: {
    key: "student2",
    firstName: "Smoke",
    lastName: "Student 2",
    displayName: "Smoke Student 2",
    intendedProvenance: "invite" as const,
    categoryName: "B",
    legacyStudentIdNumber: "STU-002-2024",
    legacyFirstName: "Bob",
    legacyLastName: "Wilson",
    legacyEmailLocalHint: "bob.wilson",
  },
  studentA1: {
    key: "studentA1",
    firstName: "Smoke",
    lastName: "Student A1",
    displayName: "Smoke Student A1",
    intendedProvenance: "manual" as const,
    categoryName: "A1",
    legacyStudentIdNumber: "STU-003-2024",
    legacyFirstName: "Carol",
    legacyLastName: "Davis",
    legacyEmailLocalHint: "carol.davis",
  },
} as const;

export const CANONICAL_SMOKE_VEHICLES = [
  {
    registrationNumber: "01-DS-24",
    categoryName: "B",
    legacyRegistrationNumber: "DS-001-2024",
    negative: false,
  },
  {
    registrationNumber: "02-DS-24",
    categoryName: "B",
    legacyRegistrationNumber: "DS-002-2024",
    negative: false,
  },
  {
    registrationNumber: "03-DS-24",
    categoryName: "A1",
    legacyRegistrationNumber: "DS-003-2024",
    negative: true,
  },
  {
    registrationNumber: "04-DS-24",
    categoryName: "B",
    legacyRegistrationNumber: "DS-004-2024",
    negative: false,
  },
  {
    registrationNumber: "05-DS-24",
    categoryName: "B",
    legacyRegistrationNumber: "DS-005-2024",
    negative: false,
  },
] as const;

/** Destination display names / plates that must not collide with non-resolved rows. */
export const SMOKE_FIXTURE_DESTINATION_DISPLAY_NAMES = [
  CANONICAL_SMOKE_INSTRUCTORS.instructor1.displayName,
  CANONICAL_SMOKE_INSTRUCTORS.instructor2.displayName,
  CANONICAL_SMOKE_INSTRUCTORS.instructorNonB.displayName,
  CANONICAL_SMOKE_STUDENTS.student1.displayName,
  CANONICAL_SMOKE_STUDENTS.student2.displayName,
  CANONICAL_SMOKE_STUDENTS.studentA1.displayName,
] as const;

export const SMOKE_FIXTURE_DESTINATION_PLATES = CANONICAL_SMOKE_VEHICLES.map(
  (v) => v.registrationNumber,
);

export const SMOKE_REQUIRED_FEATURE_KEYS = [
  "LESSON_MANAGEMENT",
  "VEHICLE_MANAGEMENT",
  "STUDENT_ACCESS",
] as const;

export type SmokeRequiredFeatureKey =
  (typeof SMOKE_REQUIRED_FEATURE_KEYS)[number];

export const DAT_SMOKE_EXPECTED_ADMIN_EMAIL_ENV =
  "DAT_SMOKE_EXPECTED_ADMIN_EMAIL";

export function displayNameOf(first: string, last: string): string {
  return `${first} ${last}`;
}

export function namesMatch(
  first: string | null | undefined,
  last: string | null | undefined,
  expectedFirst: string,
  expectedLast: string,
): boolean {
  return (
    (first ?? "").trim().toLowerCase() === expectedFirst.trim().toLowerCase() &&
    (last ?? "").trim().toLowerCase() === expectedLast.trim().toLowerCase()
  );
}
