import { describe, expect, it } from "vitest";

import { commonSchemas } from "@/lib/validation";
import {
  E2E_FIXTURE_ADMIN_PASSWORD,
  E2E_FIXTURE_ADMIN_USER_ID,
  E2E_FIXTURE_INSTRUCTOR_PASSWORD,
  E2E_FIXTURE_INSTRUCTOR_ROW_ID,
  E2E_FIXTURE_INSTRUCTOR_USER_ID,
  E2E_FIXTURE_ORG_ID,
  E2E_FIXTURE_STUDENT_1_ID,
  E2E_FIXTURE_STUDENT_1_USER_ID,
  E2E_FIXTURE_STUDENT_2_ID,
  E2E_FIXTURE_STUDENT_2_USER_ID,
  E2E_FIXTURE_STUDENT_PASSWORD,
  E2E_FIXTURE_VEHICLE_MANAGEMENT_ENABLED,
  buildE2eFixtureSafeSummary,
  formatE2eFixtureSafeSummary,
} from "@/lib/ops/provision-e2e-fixtures";

describe("provision-e2e-fixtures identity", () => {
  it("uses lesson-creation-compatible deterministic ids", () => {
    for (const id of [
      E2E_FIXTURE_ORG_ID,
      E2E_FIXTURE_ADMIN_USER_ID,
      E2E_FIXTURE_INSTRUCTOR_USER_ID,
      E2E_FIXTURE_INSTRUCTOR_ROW_ID,
      E2E_FIXTURE_STUDENT_1_USER_ID,
      E2E_FIXTURE_STUDENT_1_ID,
      E2E_FIXTURE_STUDENT_2_USER_ID,
      E2E_FIXTURE_STUDENT_2_ID,
    ]) {
      expect(commonSchemas.uuid.safeParse(id).success).toBe(true);
    }
  });
  it("keeps operational Student ids distinct from linked User ids", () => {
    expect(E2E_FIXTURE_STUDENT_1_ID).not.toBe(E2E_FIXTURE_STUDENT_1_USER_ID);
    expect(E2E_FIXTURE_STUDENT_2_ID).not.toBe(E2E_FIXTURE_STUDENT_2_USER_ID);
    expect(E2E_FIXTURE_STUDENT_1_ID).not.toBe(E2E_FIXTURE_STUDENT_2_ID);
    expect(E2E_FIXTURE_INSTRUCTOR_ROW_ID).not.toBe(
      E2E_FIXTURE_INSTRUCTOR_USER_ID,
    );
    expect(E2E_FIXTURE_ADMIN_USER_ID).not.toBe(E2E_FIXTURE_INSTRUCTOR_USER_ID);
  });

  it("disables VEHICLE_MANAGEMENT for the vehicles-gating contract", () => {
    expect(E2E_FIXTURE_VEHICLE_MANAGEMENT_ENABLED).toBe(false);
    expect(buildE2eFixtureSafeSummary().vehicleManagementEnabled).toBe(false);
  });

  it("does not include passwords in the safe fixture summary", () => {
    const summary = formatE2eFixtureSafeSummary();
    expect(summary).toContain(E2E_FIXTURE_ORG_ID);
    expect(summary).toContain(E2E_FIXTURE_STUDENT_1_ID);
    expect(summary).toContain(E2E_FIXTURE_INSTRUCTOR_USER_ID);
    expect(summary).not.toContain(E2E_FIXTURE_ADMIN_PASSWORD);
    expect(summary).not.toContain(E2E_FIXTURE_INSTRUCTOR_PASSWORD);
    expect(summary).not.toContain(E2E_FIXTURE_STUDENT_PASSWORD);
  });
});
