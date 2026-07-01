/**
 * Zero-write production smoke fixture preflight (authenticated admin APIs only).
 */

import {
  resolveSmokeExpectedLessonCategory,
  validateSmokeMutationInstructorReadiness,
  type SmokeInstructorBookingReadinessProfile,
} from "./smoke-mutation-readiness";

export type SmokeFixtureExpected = {
  studentEmail?: string;
  studentSchoolId?: string;
  vehicleRegistration?: string;
  instructorEmail?: string;
};

export type SmokeFixtureConfig = {
  organizationId: string;
  studentId: string;
  instructorUserId: string;
  vehicleId: number;
  expected: SmokeFixtureExpected;
};

export type SmokeFixtureCheckResult = {
  name: string;
  ok: boolean;
  detail: string;
};

export type SmokeFixtureSessionPayload = {
  organizationId: string | null;
  userRole: string | null;
  userId: string | null;
};

export type SmokeFixtureStudentPayload = {
  id: string;
  email?: string | null;
  schoolStudentId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export type SmokeFixtureInstructorPayload = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isAvailableForBooking?: boolean;
  /** Present when booking endpoint exposes category metadata (`forBooking=true`). */
  qualifiedCategoryNames?: string[];
  /** Present when booking endpoint exposes license expiry metadata. */
  instructorLicenseExpiry?: string | null;
};

export type SmokeFixtureVehiclePayload = {
  id: number;
  registrationNumber?: string | null;
  isActive?: boolean | null;
  underMaintenance?: boolean | null;
  status?: string | null;
};

export type SmokeFixtureFeaturesPayload = Record<string, boolean>;

export type SmokeFixtureHttpResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};

export type SmokeFixtureRequest = (
  path: string,
  init?: { headers?: Record<string, string> },
) => Promise<SmokeFixtureHttpResponse>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(response: SmokeFixtureHttpResponse): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function parseSmokeFixtureExpectedFromEnv(): SmokeFixtureExpected {
  return {
    studentEmail:
      process.env.DAT_SMOKE_EXPECTED_STUDENT_EMAIL?.trim() || undefined,
    studentSchoolId:
      process.env.DAT_SMOKE_EXPECTED_STUDENT_SCHOOL_ID?.trim() || undefined,
    vehicleRegistration:
      process.env.DAT_SMOKE_EXPECTED_VEHICLE_REGISTRATION?.trim() || undefined,
    instructorEmail:
      process.env.DAT_SMOKE_EXPECTED_INSTRUCTOR_EMAIL?.trim() || undefined,
  };
}

export function parseSmokeFixtureStudent(
  body: unknown,
): SmokeFixtureStudentPayload | null {
  if (!isRecord(body)) return null;
  const data = isRecord(body.data) ? body.data : body;
  const student = isRecord(data.student) ? data.student : data;
  if (typeof student.id !== "string") return null;
  return {
    id: student.id,
    email: typeof student.email === "string" ? student.email : null,
    schoolStudentId:
      typeof student.schoolStudentId === "string"
        ? student.schoolStudentId
        : null,
    firstName: typeof student.firstName === "string" ? student.firstName : null,
    lastName: typeof student.lastName === "string" ? student.lastName : null,
  };
}

export function parseSmokeFixtureSession(
  body: unknown,
): SmokeFixtureSessionPayload | null {
  if (!isRecord(body)) return null;
  return {
    organizationId:
      typeof body.organizationId === "string" ? body.organizationId : null,
    userRole: typeof body.userRole === "string" ? body.userRole : null,
    userId: typeof body.userId === "string" ? body.userId : null,
  };
}

export function parseSmokeFixtureInstructors(
  body: unknown,
): SmokeFixtureInstructorPayload[] {
  if (!isRecord(body)) return [];
  const raw = Array.isArray(body.instructors) ? body.instructors : [];
  return raw
    .filter((row): row is Record<string, unknown> => isRecord(row))
    .filter((row) => typeof row.id === "string")
    .map((row) => ({
      id: row.id as string,
      email: typeof row.email === "string" ? row.email : null,
      firstName: typeof row.firstName === "string" ? row.firstName : null,
      lastName: typeof row.lastName === "string" ? row.lastName : null,
      isAvailableForBooking:
        typeof row.isAvailableForBooking === "boolean"
          ? row.isAvailableForBooking
          : undefined,
      ...(function parseBookingMetadata() {
        const payload: Pick<
          SmokeFixtureInstructorPayload,
          "qualifiedCategoryNames" | "instructorLicenseExpiry"
        > = {};

        if ("qualifiedCategoryNames" in row) {
          payload.qualifiedCategoryNames = Array.isArray(
            row.qualifiedCategoryNames,
          )
            ? row.qualifiedCategoryNames.filter(
                (name): name is string => typeof name === "string",
              )
            : [];
        }

        if ("instructorLicenseExpiry" in row) {
          payload.instructorLicenseExpiry =
            typeof row.instructorLicenseExpiry === "string"
              ? row.instructorLicenseExpiry
              : row.instructorLicenseExpiry === null
                ? null
                : null;
        }

        return payload;
      })(),
    }));
}

export function parseSmokeFixtureVehicles(
  body: unknown,
): SmokeFixtureVehiclePayload[] {
  if (!isRecord(body)) return [];
  const raw = Array.isArray(body.vehicles) ? body.vehicles : [];
  return raw
    .filter((row): row is Record<string, unknown> => isRecord(row))
    .filter((row) => typeof row.id === "number")
    .map((row) => ({
      id: row.id as number,
      registrationNumber:
        typeof row.registrationNumber === "string"
          ? row.registrationNumber
          : null,
      isActive: typeof row.isActive === "boolean" ? row.isActive : null,
      underMaintenance:
        typeof row.underMaintenance === "boolean" ? row.underMaintenance : null,
      status: typeof row.status === "string" ? row.status : null,
    }));
}

export function parseSmokeFixtureFeatures(
  body: unknown,
): SmokeFixtureFeaturesPayload | null {
  if (!isRecord(body) || !isRecord(body.features)) return null;
  const features: SmokeFixtureFeaturesPayload = {};
  for (const [key, value] of Object.entries(body.features)) {
    if (typeof value === "boolean") {
      features[key] = value;
    }
  }
  return features;
}

export function validateSmokeFixtureSession(
  session: SmokeFixtureSessionPayload | null,
  config: SmokeFixtureConfig,
): SmokeFixtureCheckResult {
  if (!session) {
    return {
      name: "session",
      ok: false,
      detail: "Could not parse /api/config/features session payload",
    };
  }

  if (session.userRole !== "SUPER_ADMIN") {
    return {
      name: "session_role",
      ok: false,
      detail: `Expected SUPER_ADMIN session, got ${session.userRole ?? "(missing)"}`,
    };
  }

  if (!session.organizationId) {
    return {
      name: "session_org",
      ok: false,
      detail: "Authenticated session has no organizationId",
    };
  }

  if (session.organizationId !== config.organizationId) {
    return {
      name: "session_org",
      ok: false,
      detail: `Session organizationId "${session.organizationId}" does not match DAT_SMOKE_ORG_ID "${config.organizationId}"`,
    };
  }

  return {
    name: "session_org",
    ok: true,
    detail: `Session organizationId matches ${config.organizationId}`,
  };
}

export function validateSmokeFixtureStudent(
  student: SmokeFixtureStudentPayload | null,
  config: SmokeFixtureConfig,
): SmokeFixtureCheckResult[] {
  const results: SmokeFixtureCheckResult[] = [];

  if (!student) {
    return [
      {
        name: "student",
        ok: false,
        detail: `Student ${config.studentId} not found or response invalid`,
      },
    ];
  }

  if (student.id !== config.studentId) {
    results.push({
      name: "student_id",
      ok: false,
      detail: `Student id mismatch: expected ${config.studentId}, got ${student.id}`,
    });
  } else {
    results.push({
      name: "student_id",
      ok: true,
      detail: `Student id ${config.studentId} found`,
    });
  }

  const { expected } = config;
  if (expected.studentEmail) {
    const emailMatches =
      student.email?.trim().toLowerCase() ===
      expected.studentEmail.trim().toLowerCase();
    results.push({
      name: "student_email",
      ok: emailMatches,
      detail: emailMatches
        ? `Student email matches ${expected.studentEmail}`
        : `Student email "${student.email ?? "(missing)"}" does not match expected ${expected.studentEmail}`,
    });
  }

  if (expected.studentSchoolId) {
    const schoolIdMatches =
      student.schoolStudentId === expected.studentSchoolId;
    results.push({
      name: "student_school_id",
      ok: schoolIdMatches,
      detail: schoolIdMatches
        ? `Student schoolStudentId matches ${expected.studentSchoolId}`
        : `Student schoolStudentId "${student.schoolStudentId ?? "(missing)"}" does not match expected ${expected.studentSchoolId}`,
    });
  }

  if (!expected.studentEmail && !expected.studentSchoolId) {
    results.push({
      name: "student_identity",
      ok: true,
      detail:
        "Student identity checks skipped (set DAT_SMOKE_EXPECTED_STUDENT_EMAIL and/or DAT_SMOKE_EXPECTED_STUDENT_SCHOOL_ID for stricter validation)",
    });
  }

  return results;
}

export function validateSmokeFixtureInstructor(
  instructors: SmokeFixtureInstructorPayload[],
  config: SmokeFixtureConfig,
): SmokeFixtureCheckResult[] {
  const instructor = instructors.find(
    (row) => row.id === config.instructorUserId,
  );

  if (!instructor) {
    return [
      {
        name: "instructor",
        ok: false,
        detail: `Instructor user ${config.instructorUserId} not found in /api/admin/instructors/all?forBooking=true`,
      },
    ];
  }

  const results: SmokeFixtureCheckResult[] = [
    {
      name: "instructor_user",
      ok: true,
      detail: `Instructor user ${config.instructorUserId} found`,
    },
  ];

  if (instructor.isAvailableForBooking === false) {
    results.push({
      name: "instructor_booking",
      ok: false,
      detail: "Smoke instructor is not available for booking",
    });
  } else {
    results.push({
      name: "instructor_booking",
      ok: true,
      detail: "Instructor is available for booking",
    });
  }

  const expectedEmail = config.expected.instructorEmail;
  if (expectedEmail) {
    const exposedEmail = instructor.email?.trim();
    if (!exposedEmail) {
      results.push({
        name: "instructor_email",
        ok: true,
        detail:
          "WARN: Instructor email not exposed by booking endpoint; validated by explicit User.id and booking availability",
      });
    } else {
      const emailMatches =
        exposedEmail.toLowerCase() === expectedEmail.trim().toLowerCase();
      results.push({
        name: "instructor_email",
        ok: emailMatches,
        detail: emailMatches
          ? `Instructor email matches ${expectedEmail}`
          : `Instructor email "${exposedEmail}" does not match expected ${expectedEmail}`,
      });
    }
  }

  const readinessProfile: SmokeInstructorBookingReadinessProfile = {
    id: instructor.id,
    isAvailableForBooking: instructor.isAvailableForBooking,
    ...(instructor.qualifiedCategoryNames !== undefined
      ? { qualifiedCategoryNames: instructor.qualifiedCategoryNames }
      : {}),
    ...(instructor.instructorLicenseExpiry !== undefined
      ? { instructorLicenseExpiry: instructor.instructorLicenseExpiry }
      : {}),
  };

  const readinessResults = validateSmokeMutationInstructorReadiness(
    readinessProfile,
    config.instructorUserId,
    resolveSmokeExpectedLessonCategory(),
  );

  results.push(
    ...readinessResults.filter(
      (result) => result.name !== "instructor_fixture",
    ),
  );

  return results;
}

export function validateSmokeFixtureVehicle(
  vehicles: SmokeFixtureVehiclePayload[],
  config: SmokeFixtureConfig,
): SmokeFixtureCheckResult[] {
  const vehicle = vehicles.find((row) => row.id === config.vehicleId);

  if (!vehicle) {
    return [
      {
        name: "vehicle",
        ok: false,
        detail: `Vehicle ${config.vehicleId} not found in /api/admin/vehicles`,
      },
    ];
  }

  const results: SmokeFixtureCheckResult[] = [
    {
      name: "vehicle_id",
      ok: true,
      detail: `Vehicle id ${config.vehicleId} found`,
    },
  ];

  const expectedRegistration = config.expected.vehicleRegistration;
  if (expectedRegistration) {
    const registrationMatches =
      vehicle.registrationNumber?.trim().toUpperCase() ===
      expectedRegistration.trim().toUpperCase();
    results.push({
      name: "vehicle_registration",
      ok: registrationMatches,
      detail: registrationMatches
        ? `Vehicle registration matches ${expectedRegistration}`
        : `Vehicle registration "${vehicle.registrationNumber ?? "(missing)"}" does not match expected ${expectedRegistration}`,
    });
  }

  if (vehicle.isActive !== true) {
    results.push({
      name: "vehicle_active",
      ok: false,
      detail: `Vehicle isActive expected true, got ${String(vehicle.isActive)}`,
    });
  } else {
    results.push({
      name: "vehicle_active",
      ok: true,
      detail: "Vehicle is active",
    });
  }

  if (vehicle.underMaintenance === true) {
    results.push({
      name: "vehicle_maintenance",
      ok: false,
      detail: "Vehicle is under maintenance",
    });
  } else {
    results.push({
      name: "vehicle_maintenance",
      ok: true,
      detail: "Vehicle is not under maintenance",
    });
  }

  if (vehicle.status !== "AVAILABLE") {
    results.push({
      name: "vehicle_status",
      ok: false,
      detail: `Vehicle status expected AVAILABLE, got ${vehicle.status ?? "(missing)"}`,
    });
  } else {
    results.push({
      name: "vehicle_status",
      ok: true,
      detail: "Vehicle status is AVAILABLE",
    });
  }

  return results;
}

export function validateSmokeFixtureDrivingFeatures(
  features: SmokeFixtureFeaturesPayload | null,
): SmokeFixtureCheckResult[] {
  if (!features) {
    return [
      {
        name: "features",
        ok: false,
        detail: "Could not parse /api/config/features payload",
      },
    ];
  }

  const results: SmokeFixtureCheckResult[] = [];

  if (features.LESSON_MANAGEMENT === false) {
    results.push({
      name: "feature_lesson_management",
      ok: false,
      detail: "LESSON_MANAGEMENT feature is disabled",
    });
  } else {
    results.push({
      name: "feature_lesson_management",
      ok: true,
      detail:
        features.LESSON_MANAGEMENT === true
          ? "LESSON_MANAGEMENT feature is enabled"
          : "LESSON_MANAGEMENT feature flag not reported (non-blocking)",
    });
  }

  if (features.VEHICLE_MANAGEMENT === false) {
    results.push({
      name: "feature_vehicle_management",
      ok: false,
      detail: "VEHICLE_MANAGEMENT feature is disabled",
    });
  } else {
    results.push({
      name: "feature_vehicle_management",
      ok: true,
      detail:
        features.VEHICLE_MANAGEMENT === true
          ? "VEHICLE_MANAGEMENT feature is enabled"
          : "VEHICLE_MANAGEMENT feature flag not reported by /api/config/features (non-blocking until vehicle fixture validated)",
    });
  }

  return results;
}

export function applySmokeFixtureVehicleFeatureEvidence(
  results: SmokeFixtureCheckResult[],
  features: SmokeFixtureFeaturesPayload | null,
): void {
  if (features?.VEHICLE_MANAGEMENT === true) {
    return;
  }

  const vehicleResults = results.filter((result) =>
    result.name.startsWith("vehicle_"),
  );
  if (
    vehicleResults.length === 0 ||
    !vehicleResults.every((result) => result.ok)
  ) {
    return;
  }

  const index = results.findIndex(
    (result) => result.name === "feature_vehicle_management",
  );
  const evidenceResult: SmokeFixtureCheckResult = {
    name: "feature_vehicle_management",
    ok: true,
    detail:
      "WARN: VEHICLE_MANAGEMENT not reported by /api/config/features; vehicle fixture validation passed via GET /api/admin/vehicles",
  };

  if (index >= 0) {
    results[index] = evidenceResult;
  } else {
    results.push(evidenceResult);
  }
}

export async function runSmokeFixturePreflight(
  request: SmokeFixtureRequest,
  config: SmokeFixtureConfig,
): Promise<SmokeFixtureCheckResult[]> {
  const results: SmokeFixtureCheckResult[] = [];

  const featuresRes = await request("/api/config/features", {
    headers: { Accept: "application/json" },
  });
  if (!featuresRes.ok) {
    results.push({
      name: "features_http",
      ok: false,
      detail: `GET /api/config/features returned HTTP ${featuresRes.status}`,
    });
    return results;
  }

  const featuresBody = await readJson(featuresRes);
  const parsedFeatures = parseSmokeFixtureFeatures(featuresBody);
  const session = parseSmokeFixtureSession(featuresBody);
  results.push(validateSmokeFixtureSession(session, config));
  results.push(...validateSmokeFixtureDrivingFeatures(parsedFeatures));

  const studentRes = await request(`/api/admin/students/${config.studentId}`, {
    headers: { Accept: "application/json" },
  });
  if (studentRes.status === 404) {
    results.push({
      name: "student_http",
      ok: false,
      detail: `GET /api/admin/students/${config.studentId} returned 404 (wrong org or missing fixture)`,
    });
  } else if (!studentRes.ok) {
    results.push({
      name: "student_http",
      ok: false,
      detail: `GET /api/admin/students/${config.studentId} returned HTTP ${studentRes.status}`,
    });
  } else {
    const studentBody = await readJson(studentRes);
    results.push(
      ...validateSmokeFixtureStudent(
        parseSmokeFixtureStudent(studentBody),
        config,
      ),
    );
  }

  const instructorsRes = await request(
    "/api/admin/instructors/all?forBooking=true",
    {
      headers: { Accept: "application/json" },
    },
  );
  if (!instructorsRes.ok) {
    results.push({
      name: "instructor_http",
      ok: false,
      detail: `GET /api/admin/instructors/all?forBooking=true returned HTTP ${instructorsRes.status}`,
    });
  } else {
    const instructorsBody = await readJson(instructorsRes);
    results.push(
      ...validateSmokeFixtureInstructor(
        parseSmokeFixtureInstructors(instructorsBody),
        config,
      ),
    );
  }

  const vehiclesRes = await request("/api/admin/vehicles", {
    headers: { Accept: "application/json" },
  });
  if (!vehiclesRes.ok) {
    results.push({
      name: "vehicle_http",
      ok: false,
      detail: `GET /api/admin/vehicles returned HTTP ${vehiclesRes.status}`,
    });
  } else {
    const vehiclesBody = await readJson(vehiclesRes);
    results.push(
      ...validateSmokeFixtureVehicle(
        parseSmokeFixtureVehicles(vehiclesBody),
        config,
      ),
    );
    applySmokeFixtureVehicleFeatureEvidence(results, parsedFeatures);
  }

  return results;
}

export function summarizeSmokeFixtureResults(
  results: SmokeFixtureCheckResult[],
): { ok: boolean; failed: SmokeFixtureCheckResult[] } {
  const failed = results.filter((result) => !result.ok);
  return { ok: failed.length === 0, failed };
}
