import { describe, it, expect } from "vitest";
import {
  INSTRUCTOR_DELETE_BLOCK_CODE,
  evaluateInstructorRecordDeleteEligibility,
} from "./instructor-record-delete-policy";

const emptyCounts = {
  lessons: 0,
  payments: 0,
  exams: 0,
  lessonRequests: 0,
  preferredStudents: 0,
  pendingInvitations: 0,
};

const baseInput = {
  linkedUserId: "user-target",
  currentUserId: "admin-1",
  userRelationConsistent: true,
  counts: emptyCounts,
};

describe("evaluateInstructorRecordDeleteEligibility", () => {
  it("allows zero-dependency instructor", () => {
    const result = evaluateInstructorRecordDeleteEligibility(baseInput);
    expect(result).toEqual({ allowed: true });
  });

  it("blocks when lessons exist", () => {
    const result = evaluateInstructorRecordDeleteEligibility({
      ...baseInput,
      counts: { ...emptyCounts, lessons: 1 },
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe(INSTRUCTOR_DELETE_BLOCK_CODE.HAS_LESSONS);
    }
  });

  it("blocks when payments exist", () => {
    const result = evaluateInstructorRecordDeleteEligibility({
      ...baseInput,
      counts: { ...emptyCounts, payments: 2 },
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe(INSTRUCTOR_DELETE_BLOCK_CODE.HAS_PAYMENTS);
    }
  });

  it("blocks when exams exist", () => {
    const result = evaluateInstructorRecordDeleteEligibility({
      ...baseInput,
      counts: { ...emptyCounts, exams: 1 },
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe(INSTRUCTOR_DELETE_BLOCK_CODE.HAS_EXAMS);
    }
  });

  it("blocks when lesson requests exist", () => {
    const result = evaluateInstructorRecordDeleteEligibility({
      ...baseInput,
      counts: { ...emptyCounts, lessonRequests: 1 },
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe(
        INSTRUCTOR_DELETE_BLOCK_CODE.HAS_LESSON_REQUESTS,
      );
    }
  });

  it("blocks when preferred students exist", () => {
    const result = evaluateInstructorRecordDeleteEligibility({
      ...baseInput,
      counts: { ...emptyCounts, preferredStudents: 1 },
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe(
        INSTRUCTOR_DELETE_BLOCK_CODE.HAS_PREFERRED_STUDENTS,
      );
    }
  });

  it("blocks when pending invitation exists", () => {
    const result = evaluateInstructorRecordDeleteEligibility({
      ...baseInput,
      counts: { ...emptyCounts, pendingInvitations: 1 },
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe(
        INSTRUCTOR_DELETE_BLOCK_CODE.HAS_PENDING_INVITATION,
      );
    }
  });

  it("blocks self-delete", () => {
    const result = evaluateInstructorRecordDeleteEligibility({
      ...baseInput,
      linkedUserId: "admin-1",
      currentUserId: "admin-1",
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe(INSTRUCTOR_DELETE_BLOCK_CODE.SELF_NOT_ALLOWED);
    }
  });

  it("blocks inconsistent user relation", () => {
    const result = evaluateInstructorRecordDeleteEligibility({
      ...baseInput,
      userRelationConsistent: false,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe(INSTRUCTOR_DELETE_BLOCK_CODE.NOT_ALLOWED);
    }
  });

  it("returns all applicable codes with primary code first", () => {
    const result = evaluateInstructorRecordDeleteEligibility({
      ...baseInput,
      linkedUserId: "admin-1",
      currentUserId: "admin-1",
      counts: { ...emptyCounts, lessons: 1, payments: 1 },
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe(INSTRUCTOR_DELETE_BLOCK_CODE.SELF_NOT_ALLOWED);
      expect(result.codes).toContain(INSTRUCTOR_DELETE_BLOCK_CODE.HAS_LESSONS);
      expect(result.codes).toContain(INSTRUCTOR_DELETE_BLOCK_CODE.HAS_PAYMENTS);
    }
  });
});
