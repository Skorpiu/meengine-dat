/**
 * Pre-mutation readiness checks for production smoke (read-only admin APIs only).
 */

import { isInstructorLicenseExpiryTodayOrFuture } from "@/lib/instructors/instructor-license-utils";
import type { SmokeFixtureConfig } from "./smoke-fixture-preflight";
import type { SmokeLessonRequest } from "./smoke-lesson-helpers";

export type SmokeMutationReadinessResult = {
  name: string;
  ok: boolean;
  detail: string;
};

export type SmokeInstructorBookingReadinessProfile = {
  id: string;
  isAvailableForBooking?: boolean;
  /** Present when the booking endpoint exposes category metadata. */
  qualifiedCategoryNames?: string[];
  /** Present when the booking endpoint exposes license expiry metadata. */
  instructorLicenseExpiry?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function resolveSmokeExpectedLessonCategory(): string {
  const fromEnv = process.env.DAT_SMOKE_EXPECTED_LESSON_CATEGORY?.trim();
  return fromEnv || "B";
}

export function parseSmokeInstructorBookingReadinessProfiles(
  body: unknown,
): SmokeInstructorBookingReadinessProfile[] {
  if (!isRecord(body)) return [];

  const raw = Array.isArray(body.instructors) ? body.instructors : [];
  return raw
    .filter((row): row is Record<string, unknown> => isRecord(row))
    .filter((row) => typeof row.id === "string")
    .map((row) => {
      const profile: SmokeInstructorBookingReadinessProfile = {
        id: row.id as string,
      };

      if (typeof row.isAvailableForBooking === "boolean") {
        profile.isAvailableForBooking = row.isAvailableForBooking;
      }

      if ("qualifiedCategoryNames" in row) {
        profile.qualifiedCategoryNames = Array.isArray(
          row.qualifiedCategoryNames,
        )
          ? row.qualifiedCategoryNames.filter(
              (name): name is string => typeof name === "string",
            )
          : [];
      }

      if ("instructorLicenseExpiry" in row) {
        profile.instructorLicenseExpiry =
          typeof row.instructorLicenseExpiry === "string"
            ? row.instructorLicenseExpiry
            : row.instructorLicenseExpiry === null
              ? null
              : null;
      }

      return profile;
    });
}

export function findSmokeInstructorBookingReadinessProfile(
  instructors: SmokeInstructorBookingReadinessProfile[],
  instructorUserId: string,
): SmokeInstructorBookingReadinessProfile | null {
  return instructors.find((row) => row.id === instructorUserId) ?? null;
}

function normalizeCategoryName(value: string): string {
  return value.trim().toUpperCase();
}

export function validateSmokeMutationInstructorReadiness(
  profile: SmokeInstructorBookingReadinessProfile | null,
  instructorUserId: string,
  requiredCategory: string,
  referenceDate: Date = new Date(),
): SmokeMutationReadinessResult[] {
  const normalizedRequired = normalizeCategoryName(requiredCategory);

  if (!profile) {
    return [
      {
        name: "instructor_fixture",
        ok: false,
        detail: `Smoke fixture instructor user ${instructorUserId} not found in /api/admin/instructors/all?forBooking=true`,
      },
    ];
  }

  const results: SmokeMutationReadinessResult[] = [
    {
      name: "instructor_fixture",
      ok: true,
      detail: `Smoke fixture instructor user ${instructorUserId} found`,
    },
  ];

  if (profile.qualifiedCategoryNames === undefined) {
    results.push({
      name: "instructor_category_readiness",
      ok: true,
      detail:
        "WARN: Instructor qualified categories are not exposed by GET /api/admin/instructors/all?forBooking=true; " +
        "deploy production-smoke-e2e-testids-v1 (or later) for pre-POST hard-fail. " +
        "POST /api/admin/lessons remains the authoritative safety boundary.",
    });
  } else {
    const hasRequiredCategory = profile.qualifiedCategoryNames.some(
      (name) => normalizeCategoryName(name) === normalizedRequired,
    );

    if (!hasRequiredCategory) {
      const exposed =
        profile.qualifiedCategoryNames.length > 0
          ? profile.qualifiedCategoryNames.join(", ")
          : "(none)";
      results.push({
        name: "instructor_category_readiness",
        ok: false,
        detail:
          `Smoke fixture instructor is not qualified for category ${requiredCategory}. ` +
          `Assign category ${requiredCategory} via People → Instructors → Edit Instructor (Qualified license categories). ` +
          `Qualified categories exposed: ${exposed}.`,
      });
    } else {
      results.push({
        name: "instructor_category_readiness",
        ok: true,
        detail: `Instructor is qualified for category ${requiredCategory}`,
      });
    }
  }

  if (profile.instructorLicenseExpiry === undefined) {
    results.push({
      name: "instructor_license_expiry",
      ok: true,
      detail:
        "WARN: Instructor license expiry is not exposed by the deployed booking endpoint; proceeding with backend enforcement.",
    });
    return results;
  }

  const expiry = profile.instructorLicenseExpiry?.trim() ?? "";
  if (!expiry) {
    results.push({
      name: "instructor_license_expiry",
      ok: true,
      detail:
        "WARN: Instructor license expiry is exposed but empty; proceeding with backend enforcement.",
    });
    return results;
  }

  const referenceLabel = referenceDate.toISOString().slice(0, 10);
  if (!isInstructorLicenseExpiryTodayOrFuture(expiry)) {
    results.push({
      name: "instructor_license_expiry",
      ok: false,
      detail: `Smoke fixture instructor license expired on ${expiry} (reference date ${referenceLabel}). Update instructor license expiry to a future date before running production mutations.`,
    });
  } else {
    results.push({
      name: "instructor_license_expiry",
      ok: true,
      detail: `Instructor license expiry ${expiry} is valid on ${referenceLabel}`,
    });
  }

  return results;
}

export async function runSmokeMutationReadiness(
  request: SmokeLessonRequest,
  config: SmokeFixtureConfig,
): Promise<SmokeMutationReadinessResult[]> {
  const requiredCategory = resolveSmokeExpectedLessonCategory();

  const response = await request("/api/admin/instructors/all?forBooking=true", {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return [
      {
        name: "instructor_http",
        ok: false,
        detail: `GET /api/admin/instructors/all?forBooking=true returned HTTP ${response.status}`,
      },
    ];
  }

  const body = await response.json().catch(() => null);
  const instructors = parseSmokeInstructorBookingReadinessProfiles(body);
  const profile = findSmokeInstructorBookingReadinessProfile(
    instructors,
    config.instructorUserId,
  );

  return validateSmokeMutationInstructorReadiness(
    profile,
    config.instructorUserId,
    requiredCategory,
  );
}

export function summarizeSmokeMutationReadiness(
  results: SmokeMutationReadinessResult[],
): { ok: boolean; failed: SmokeMutationReadinessResult[] } {
  const failed = results.filter((result) => !result.ok);
  return { ok: failed.length === 0, failed };
}
