import { describe, expect, it } from "vitest";
import {
  findSmokeInstructorBookingReadinessProfile,
  parseSmokeInstructorBookingReadinessProfiles,
  resolveSmokeExpectedLessonCategory,
  summarizeSmokeMutationReadiness,
  validateSmokeMutationInstructorReadiness,
} from "./smoke-mutation-readiness";

const instructorUserId = "instructor-user-1";

describe("resolveSmokeExpectedLessonCategory", () => {
  it("defaults to B when env is unset", () => {
    const previous = process.env.DAT_SMOKE_EXPECTED_LESSON_CATEGORY;
    delete process.env.DAT_SMOKE_EXPECTED_LESSON_CATEGORY;
    expect(resolveSmokeExpectedLessonCategory()).toBe("B");
    if (previous === undefined) {
      delete process.env.DAT_SMOKE_EXPECTED_LESSON_CATEGORY;
    } else {
      process.env.DAT_SMOKE_EXPECTED_LESSON_CATEGORY = previous;
    }
  });
});

describe("parseSmokeInstructorBookingReadinessProfiles", () => {
  it("parses category and license metadata when exposed", () => {
    const profiles = parseSmokeInstructorBookingReadinessProfiles({
      instructors: [
        {
          id: instructorUserId,
          qualifiedCategoryNames: ["B", "A"],
          instructorLicenseExpiry: "2030-12-31",
        },
      ],
    });

    expect(profiles[0]?.qualifiedCategoryNames).toEqual(["B", "A"]);
    expect(profiles[0]?.instructorLicenseExpiry).toBe("2030-12-31");
  });

  it("leaves category/license undefined when not exposed", () => {
    const profiles = parseSmokeInstructorBookingReadinessProfiles({
      instructors: [{ id: instructorUserId, isAvailableForBooking: true }],
    });

    expect(profiles[0]?.qualifiedCategoryNames).toBeUndefined();
    expect(profiles[0]?.instructorLicenseExpiry).toBeUndefined();
  });
});

describe("validateSmokeMutationInstructorReadiness", () => {
  const referenceDate = new Date("2026-07-01T12:00:00.000Z");

  it("passes when instructor has category B and future license", () => {
    const profile = findSmokeInstructorBookingReadinessProfile(
      parseSmokeInstructorBookingReadinessProfiles({
        instructors: [
          {
            id: instructorUserId,
            qualifiedCategoryNames: ["B"],
            instructorLicenseExpiry: "2030-12-31",
          },
        ],
      }),
      instructorUserId,
    );

    const results = validateSmokeMutationInstructorReadiness(
      profile,
      instructorUserId,
      "B",
      referenceDate,
    );

    expect(summarizeSmokeMutationReadiness(results).ok).toBe(true);
    expect(
      results.find((result) => result.name === "instructor_category_readiness")
        ?.ok,
    ).toBe(true);
    expect(
      results.find((result) => result.name === "instructor_license_expiry")?.ok,
    ).toBe(true);
  });

  it("fails before POST when instructor lacks category B", () => {
    const profile = findSmokeInstructorBookingReadinessProfile(
      parseSmokeInstructorBookingReadinessProfiles({
        instructors: [
          {
            id: instructorUserId,
            qualifiedCategoryNames: ["A"],
            instructorLicenseExpiry: "2030-12-31",
          },
        ],
      }),
      instructorUserId,
    );

    const results = validateSmokeMutationInstructorReadiness(
      profile,
      instructorUserId,
      "B",
      referenceDate,
    );

    const categoryResult = results.find(
      (result) => result.name === "instructor_category_readiness",
    );
    expect(categoryResult?.ok).toBe(false);
    expect(categoryResult?.detail).toContain(
      "Smoke fixture instructor is not qualified for category B",
    );
    expect(categoryResult?.detail).toContain(
      "Assign category B via People → Instructors → Edit Instructor",
    );
    expect(summarizeSmokeMutationReadiness(results).ok).toBe(false);
  });

  it("warns and passes when category metadata is not exposed", () => {
    const profile = findSmokeInstructorBookingReadinessProfile(
      parseSmokeInstructorBookingReadinessProfiles({
        instructors: [{ id: instructorUserId, isAvailableForBooking: true }],
      }),
      instructorUserId,
    );

    const results = validateSmokeMutationInstructorReadiness(
      profile,
      instructorUserId,
      "B",
      referenceDate,
    );

    const categoryResult = results.find(
      (result) => result.name === "instructor_category_readiness",
    );
    expect(categoryResult?.ok).toBe(true);
    expect(categoryResult?.detail).toContain("WARN:");
    expect(categoryResult?.detail).toContain(
      "POST /api/admin/lessons remains the authoritative safety boundary",
    );
    expect(summarizeSmokeMutationReadiness(results).ok).toBe(true);
  });

  it("fails when instructor license is expired and exposed", () => {
    const profile = findSmokeInstructorBookingReadinessProfile(
      parseSmokeInstructorBookingReadinessProfiles({
        instructors: [
          {
            id: instructorUserId,
            qualifiedCategoryNames: ["B"],
            instructorLicenseExpiry: "2026-06-30",
          },
        ],
      }),
      instructorUserId,
    );

    const results = validateSmokeMutationInstructorReadiness(
      profile,
      instructorUserId,
      "B",
      referenceDate,
    );

    const licenseResult = results.find(
      (result) => result.name === "instructor_license_expiry",
    );
    expect(licenseResult?.ok).toBe(false);
    expect(licenseResult?.detail).toContain("license expired");
    expect(summarizeSmokeMutationReadiness(results).ok).toBe(false);
  });

  it("warns and passes when license expiry is not exposed", () => {
    const profile = findSmokeInstructorBookingReadinessProfile(
      parseSmokeInstructorBookingReadinessProfiles({
        instructors: [
          {
            id: instructorUserId,
            qualifiedCategoryNames: ["B"],
          },
        ],
      }),
      instructorUserId,
    );

    const results = validateSmokeMutationInstructorReadiness(
      profile,
      instructorUserId,
      "B",
      referenceDate,
    );

    const licenseResult = results.find(
      (result) => result.name === "instructor_license_expiry",
    );
    expect(licenseResult?.ok).toBe(true);
    expect(licenseResult?.detail).toContain("WARN:");
    expect(licenseResult?.detail).toContain("backend enforcement");
    expect(summarizeSmokeMutationReadiness(results).ok).toBe(true);
  });
});
