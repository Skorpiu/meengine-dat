import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertSmokeFixtureEnvVars,
  assertSmokeFixturePreflightAllowed,
  assertSmokeTargetAllowed,
  parseSmokeFixtureConfigFromEnv,
} from "./env-guards";

const SMOKE_ENV_VARS = [
  "DAT_SMOKE_BASE_URL",
  "DAT_E2E_ALLOW_PRODUCTION",
  "DAT_SMOKE_ALLOWED_HOSTS",
  "DAT_SMOKE_ADMIN_EMAIL",
  "DAT_SMOKE_ADMIN_PASSWORD",
  "DAT_SMOKE_ORG_ID",
  "DAT_SMOKE_STUDENT_ID",
  "DAT_SMOKE_INSTRUCTOR_USER_ID",
  "DAT_SMOKE_VEHICLE_ID",
  "DAT_SMOKE_EXPECTED_STUDENT_EMAIL",
  "DAT_SMOKE_EXPECTED_STUDENT_SCHOOL_ID",
  "DAT_SMOKE_EXPECTED_VEHICLE_REGISTRATION",
  "DAT_SMOKE_EXPECTED_INSTRUCTOR_EMAIL",
  "E2E_SKIP_WEB_SERVER",
  "E2E_BASE_URL",
  "PLAYWRIGHT_BASE_URL",
] as const;

function snapshotProcessEnv(): NodeJS.ProcessEnv {
  return { ...process.env };
}

function restoreProcessEnv(snapshot: NodeJS.ProcessEnv): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in snapshot)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function clearSmokeEnvVars(): void {
  for (const key of SMOKE_ENV_VARS) {
    delete process.env[key];
  }
}

let envBackup: NodeJS.ProcessEnv;

beforeEach(() => {
  envBackup = snapshotProcessEnv();
  clearSmokeEnvVars();
});

afterEach(() => {
  restoreProcessEnv(envBackup);
});

describe("parseSmokeFixtureConfigFromEnv", () => {
  it("returns null when required fixture IDs are missing", () => {
    expect(parseSmokeFixtureConfigFromEnv()).toBeNull();
  });

  it("parses fixture config when all required IDs are set", () => {
    process.env.DAT_SMOKE_ORG_ID = "org-smoke-1";
    process.env.DAT_SMOKE_STUDENT_ID = "student-1";
    process.env.DAT_SMOKE_INSTRUCTOR_USER_ID = "instructor-user-1";
    process.env.DAT_SMOKE_VEHICLE_ID = "90";
    process.env.DAT_SMOKE_EXPECTED_STUDENT_EMAIL =
      "smoke.student@example.invalid";
    process.env.DAT_SMOKE_EXPECTED_STUDENT_SCHOOL_ID = "26001";

    expect(parseSmokeFixtureConfigFromEnv()).toEqual({
      organizationId: "org-smoke-1",
      studentId: "student-1",
      instructorUserId: "instructor-user-1",
      vehicleId: 90,
      expected: {
        studentEmail: "smoke.student@example.invalid",
        studentSchoolId: "26001",
        vehicleRegistration: undefined,
        instructorEmail: undefined,
      },
    });
  });

  it("parses optional expected instructor email and vehicle registration", () => {
    process.env.DAT_SMOKE_ORG_ID = "org-smoke-1";
    process.env.DAT_SMOKE_STUDENT_ID = "student-1";
    process.env.DAT_SMOKE_INSTRUCTOR_USER_ID = "instructor-user-1";
    process.env.DAT_SMOKE_VEHICLE_ID = "90";
    process.env.DAT_SMOKE_EXPECTED_INSTRUCTOR_EMAIL = "afilipa.lab@gmail.com";
    process.env.DAT_SMOKE_EXPECTED_VEHICLE_REGISTRATION = "SM-00-KE";

    expect(parseSmokeFixtureConfigFromEnv()).toEqual({
      organizationId: "org-smoke-1",
      studentId: "student-1",
      instructorUserId: "instructor-user-1",
      vehicleId: 90,
      expected: {
        studentEmail: undefined,
        studentSchoolId: undefined,
        vehicleRegistration: "SM-00-KE",
        instructorEmail: "afilipa.lab@gmail.com",
      },
    });
  });
});

describe("assertSmokeFixtureEnvVars", () => {
  it("throws when DAT_SMOKE_ORG_ID is missing", () => {
    process.env.DAT_SMOKE_STUDENT_ID = "student-1";
    process.env.DAT_SMOKE_INSTRUCTOR_USER_ID = "instructor-user-1";
    process.env.DAT_SMOKE_VEHICLE_ID = "90";

    expect(() => assertSmokeFixtureEnvVars()).toThrow(/DAT_SMOKE_ORG_ID/);
  });

  it("throws when DAT_SMOKE_VEHICLE_ID is not a positive integer", () => {
    process.env.DAT_SMOKE_ORG_ID = "org-smoke-1";
    process.env.DAT_SMOKE_STUDENT_ID = "student-1";
    process.env.DAT_SMOKE_INSTRUCTOR_USER_ID = "instructor-user-1";
    process.env.DAT_SMOKE_VEHICLE_ID = "not-a-number";

    expect(() => assertSmokeFixtureEnvVars()).toThrow(/DAT_SMOKE_VEHICLE_ID/);
  });
});

describe("assertSmokeFixturePreflightAllowed", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows local host without production opt-in when fixture IDs are set", () => {
    process.env.DAT_SMOKE_BASE_URL = "http://localhost:3000";
    process.env.DAT_SMOKE_ORG_ID = "org-smoke-1";
    process.env.DAT_SMOKE_STUDENT_ID = "student-1";
    process.env.DAT_SMOKE_INSTRUCTOR_USER_ID = "instructor-user-1";
    process.env.DAT_SMOKE_VEHICLE_ID = "90";

    expect(assertSmokeFixturePreflightAllowed().host).toBe("localhost");
  });

  it("requires production opt-in for hosted targets", () => {
    process.env.DAT_SMOKE_BASE_URL = "https://www.meengine.io";
    process.env.DAT_SMOKE_ALLOWED_HOSTS = "www.meengine.io";
    process.env.DAT_SMOKE_ORG_ID = "org-smoke-1";
    process.env.DAT_SMOKE_STUDENT_ID = "student-1";
    process.env.DAT_SMOKE_INSTRUCTOR_USER_ID = "instructor-user-1";
    process.env.DAT_SMOKE_VEHICLE_ID = "90";

    expect(() => assertSmokeFixturePreflightAllowed()).toThrow(
      /DAT_E2E_ALLOW_PRODUCTION=true/,
    );
  });

  it("requires fixture IDs even when readonly target guard passes", () => {
    process.env.DAT_SMOKE_BASE_URL = "http://localhost:3000";

    expect(assertSmokeTargetAllowed().host).toBe("localhost");
    expect(() => assertSmokeFixturePreflightAllowed()).toThrow(
      /DAT_SMOKE_ORG_ID/,
    );
  });
});
