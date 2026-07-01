import { describe, expect, it } from "vitest";
import {
  applySmokeFixtureVehicleFeatureEvidence,
  runSmokeFixturePreflight,
  summarizeSmokeFixtureResults,
  validateSmokeFixtureDrivingFeatures,
  validateSmokeFixtureInstructor,
  validateSmokeFixtureSession,
  validateSmokeFixtureStudent,
  validateSmokeFixtureVehicle,
  type SmokeFixtureConfig,
  type SmokeFixtureHttpResponse,
} from "./smoke-fixture-preflight";

const baseConfig: SmokeFixtureConfig = {
  organizationId: "org-smoke-1",
  studentId: "student-1",
  instructorUserId: "instructor-user-1",
  vehicleId: 90,
  expected: {
    studentEmail: "rukahh@gmail.com",
    studentSchoolId: "26001",
    vehicleRegistration: "SM-00-KE",
    instructorEmail: "afilipa.lab@gmail.com",
  },
};

function jsonResponse(
  body: unknown,
  ok = true,
  status = 200,
): SmokeFixtureHttpResponse {
  return {
    ok,
    status,
    json: async () => body,
  };
}

describe("validateSmokeFixtureSession", () => {
  it("passes when session org and role match", () => {
    const result = validateSmokeFixtureSession(
      {
        organizationId: "org-smoke-1",
        userRole: "SUPER_ADMIN",
        userId: "admin-1",
      },
      baseConfig,
    );

    expect(result.ok).toBe(true);
  });

  it("fails when session organization does not match fixture org", () => {
    const result = validateSmokeFixtureSession(
      {
        organizationId: "other-org",
        userRole: "SUPER_ADMIN",
        userId: "admin-1",
      },
      baseConfig,
    );

    expect(result.ok).toBe(false);
    expect(result.detail).toContain("does not match DAT_SMOKE_ORG_ID");
  });
});

describe("validateSmokeFixtureStudent", () => {
  it("validates student id and expected identity fields", () => {
    const results = validateSmokeFixtureStudent(
      {
        id: "student-1",
        email: "rukahh@gmail.com",
        schoolStudentId: "26001",
        firstName: "Smoke",
        lastName: "Student",
      },
      baseConfig,
    );

    expect(results.every((result) => result.ok)).toBe(true);
  });

  it("fails when expected email does not match", () => {
    const results = validateSmokeFixtureStudent(
      {
        id: "student-1",
        email: "wrong@example.invalid",
        schoolStudentId: "26001",
      },
      baseConfig,
    );

    const emailResult = results.find(
      (result) => result.name === "student_email",
    );
    expect(emailResult?.ok).toBe(false);
  });
});

describe("validateSmokeFixtureInstructor", () => {
  it("fails when instructor user is missing from booking list", () => {
    const results = validateSmokeFixtureInstructor([], baseConfig);
    expect(results[0]?.ok).toBe(false);
  });

  it("passes when instructor is available for booking", () => {
    const results = validateSmokeFixtureInstructor(
      [
        {
          id: "instructor-user-1",
          email: "afilipa.lab@gmail.com",
          isAvailableForBooking: true,
        },
      ],
      baseConfig,
    );

    expect(results.every((result) => result.ok)).toBe(true);
  });

  it("warns when expected instructor email is set but endpoint does not expose email", () => {
    const results = validateSmokeFixtureInstructor(
      [
        {
          id: "instructor-user-1",
          isAvailableForBooking: true,
        },
      ],
      baseConfig,
    );

    const emailResult = results.find(
      (result) => result.name === "instructor_email",
    );
    expect(emailResult?.ok).toBe(true);
    expect(emailResult?.detail).toContain("WARN:");
    expect(emailResult?.detail).toContain("not exposed");
    expect(summarizeSmokeFixtureResults(results).ok).toBe(true);
  });

  it("fails when instructor email is exposed but mismatched", () => {
    const results = validateSmokeFixtureInstructor(
      [
        {
          id: "instructor-user-1",
          email: "wrong@example.invalid",
          isAvailableForBooking: true,
        },
      ],
      baseConfig,
    );

    const emailResult = results.find(
      (result) => result.name === "instructor_email",
    );
    expect(emailResult?.ok).toBe(false);
    expect(summarizeSmokeFixtureResults(results).ok).toBe(false);
  });
});

describe("validateSmokeFixtureVehicle", () => {
  it("passes for an available active smoke vehicle", () => {
    const results = validateSmokeFixtureVehicle(
      [
        {
          id: 90,
          registrationNumber: "SM-00-KE",
          isActive: true,
          underMaintenance: false,
          status: "AVAILABLE",
        },
      ],
      baseConfig,
    );

    expect(results.every((result) => result.ok)).toBe(true);
  });

  it("fails when vehicle registration does not match", () => {
    const results = validateSmokeFixtureVehicle(
      [
        {
          id: 90,
          registrationNumber: "WRONG-REG",
          isActive: true,
          underMaintenance: false,
          status: "AVAILABLE",
        },
      ],
      baseConfig,
    );

    const registrationResult = results.find(
      (result) => result.name === "vehicle_registration",
    );
    expect(registrationResult?.ok).toBe(false);
  });

  it("fails when expected vehicle is missing from list", () => {
    const results = validateSmokeFixtureVehicle([], baseConfig);
    expect(results[0]?.ok).toBe(false);
    expect(results[0]?.name).toBe("vehicle");
  });
});

describe("validateSmokeFixtureDrivingFeatures", () => {
  it("fails when vehicle management is explicitly disabled", () => {
    const results = validateSmokeFixtureDrivingFeatures({
      VEHICLE_MANAGEMENT: false,
      LESSON_MANAGEMENT: true,
    });

    const vehicleFeature = results.find(
      (result) => result.name === "feature_vehicle_management",
    );
    expect(vehicleFeature?.ok).toBe(false);
  });

  it("does not hard-fail when vehicle management flag is not reported", () => {
    const results = validateSmokeFixtureDrivingFeatures({
      LESSON_MANAGEMENT: true,
    });

    const vehicleFeature = results.find(
      (result) => result.name === "feature_vehicle_management",
    );
    expect(vehicleFeature?.ok).toBe(true);
    expect(vehicleFeature?.detail).toContain("not reported");
  });
});

describe("applySmokeFixtureVehicleFeatureEvidence", () => {
  it("upgrades vehicle feature check when vehicle fixture validation passed", () => {
    const results = [
      ...validateSmokeFixtureDrivingFeatures({ LESSON_MANAGEMENT: true }),
      ...validateSmokeFixtureVehicle(
        [
          {
            id: 90,
            registrationNumber: "SM-00-KE",
            isActive: true,
            underMaintenance: false,
            status: "AVAILABLE",
          },
        ],
        baseConfig,
      ),
    ];

    applySmokeFixtureVehicleFeatureEvidence(results, {
      LESSON_MANAGEMENT: true,
    });

    const vehicleFeature = results.find(
      (result) => result.name === "feature_vehicle_management",
    );
    expect(vehicleFeature?.ok).toBe(true);
    expect(vehicleFeature?.detail).toContain("WARN:");
    expect(vehicleFeature?.detail).toContain(
      "vehicle fixture validation passed",
    );
    expect(summarizeSmokeFixtureResults(results).ok).toBe(true);
  });
});

describe("runSmokeFixturePreflight", () => {
  it("passes when vehicle feature is not reported but vehicle fixture is valid", async () => {
    const results = await runSmokeFixturePreflight(async (path) => {
      if (path === "/api/config/features") {
        return jsonResponse({
          organizationId: "org-smoke-1",
          userRole: "SUPER_ADMIN",
          userId: "admin-1",
          features: { LESSON_MANAGEMENT: true },
        });
      }
      if (path.startsWith("/api/admin/students/")) {
        return jsonResponse({
          data: {
            student: {
              id: "student-1",
              email: "rukahh@gmail.com",
              schoolStudentId: "26001",
            },
          },
        });
      }
      if (path.startsWith("/api/admin/instructors/all")) {
        return jsonResponse({
          instructors: [
            {
              id: "instructor-user-1",
              isAvailableForBooking: true,
            },
          ],
        });
      }
      if (path === "/api/admin/vehicles") {
        return jsonResponse({
          vehicles: [
            {
              id: 90,
              registrationNumber: "SM-00-KE",
              isActive: true,
              underMaintenance: false,
              status: "AVAILABLE",
            },
          ],
        });
      }
      throw new Error(`Unexpected path: ${path}`);
    }, baseConfig);

    expect(summarizeSmokeFixtureResults(results).ok).toBe(true);

    const vehicleFeature = results.find(
      (result) => result.name === "feature_vehicle_management",
    );
    expect(vehicleFeature?.ok).toBe(true);
    expect(vehicleFeature?.detail).toContain("WARN:");
  });

  it("fails when vehicle endpoint succeeds but expected vehicle is missing", async () => {
    const results = await runSmokeFixturePreflight(async (path) => {
      if (path === "/api/config/features") {
        return jsonResponse({
          organizationId: "org-smoke-1",
          userRole: "SUPER_ADMIN",
          userId: "admin-1",
          features: { LESSON_MANAGEMENT: true },
        });
      }
      if (path.startsWith("/api/admin/students/")) {
        return jsonResponse({
          data: {
            student: {
              id: "student-1",
              email: "rukahh@gmail.com",
              schoolStudentId: "26001",
            },
          },
        });
      }
      if (path.startsWith("/api/admin/instructors/all")) {
        return jsonResponse({
          instructors: [
            {
              id: "instructor-user-1",
              isAvailableForBooking: true,
            },
          ],
        });
      }
      if (path === "/api/admin/vehicles") {
        return jsonResponse({ vehicles: [] });
      }
      throw new Error(`Unexpected path: ${path}`);
    }, baseConfig);

    expect(summarizeSmokeFixtureResults(results).ok).toBe(false);
    expect(
      results.some((result) => result.name === "vehicle" && !result.ok),
    ).toBe(true);
  });

  it("fails when vehicle endpoint returns non-OK status", async () => {
    const results = await runSmokeFixturePreflight(async (path) => {
      if (path === "/api/config/features") {
        return jsonResponse({
          organizationId: "org-smoke-1",
          userRole: "SUPER_ADMIN",
          userId: "admin-1",
          features: { LESSON_MANAGEMENT: true },
        });
      }
      if (path.startsWith("/api/admin/students/")) {
        return jsonResponse({
          data: {
            student: {
              id: "student-1",
              email: "rukahh@gmail.com",
              schoolStudentId: "26001",
            },
          },
        });
      }
      if (path.startsWith("/api/admin/instructors/all")) {
        return jsonResponse({
          instructors: [
            {
              id: "instructor-user-1",
              isAvailableForBooking: true,
            },
          ],
        });
      }
      if (path === "/api/admin/vehicles") {
        return jsonResponse(null, false, 403);
      }
      throw new Error(`Unexpected path: ${path}`);
    }, baseConfig);

    expect(summarizeSmokeFixtureResults(results).ok).toBe(false);
    expect(
      results.some((result) => result.name === "vehicle_http" && !result.ok),
    ).toBe(true);
  });
});

describe("summarizeSmokeFixtureResults", () => {
  it("reports failed checks", () => {
    const summary = summarizeSmokeFixtureResults([
      { name: "ok", ok: true, detail: "fine" },
      { name: "bad", ok: false, detail: "broken" },
    ]);

    expect(summary.ok).toBe(false);
    expect(summary.failed).toHaveLength(1);
  });

  it("treats WARN results as overall pass", () => {
    const summary = summarizeSmokeFixtureResults([
      { name: "warn", ok: true, detail: "WARN: advisory only" },
    ]);

    expect(summary.ok).toBe(true);
  });
});
