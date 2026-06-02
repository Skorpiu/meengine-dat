import { describe, it, expect } from "vitest";
import {
  STUDENT_DELETE_BLOCK_CODE,
  canShowStudentRecordDeleteAction,
  evaluateStudentRecordDeleteEligibility,
} from "@/lib/students/student-record-delete-policy";

const emptyCounts = {
  lessons: 0,
  userInvitations: 0,
  lessonCounters: 0,
  lessonRequests: 0,
  examRegistrations: 0,
  payments: 0,
};

describe("evaluateStudentRecordDeleteEligibility", () => {
  it("allows empty MANUAL_ONLY student with no links", () => {
    const result = evaluateStudentRecordDeleteEligibility({
      appAccessMode: "MANUAL_ONLY",
      userId: null,
      counts: emptyCounts,
    });
    expect(result).toEqual({ allowed: true });
  });

  it("blocks APP_USER", () => {
    const result = evaluateStudentRecordDeleteEligibility({
      appAccessMode: "APP_USER",
      userId: "user-1",
      counts: emptyCounts,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe(STUDENT_DELETE_BLOCK_CODE.NOT_MANUAL_ONLY);
      expect(result.codes).toContain(STUDENT_DELETE_BLOCK_CODE.NOT_MANUAL_ONLY);
      expect(result.codes).toContain(STUDENT_DELETE_BLOCK_CODE.HAS_LINKED_USER);
    }
  });

  it("blocks INVITED without userId", () => {
    const result = evaluateStudentRecordDeleteEligibility({
      appAccessMode: "INVITED",
      userId: null,
      counts: emptyCounts,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe(STUDENT_DELETE_BLOCK_CODE.NOT_MANUAL_ONLY);
    }
  });

  it("blocks linked user on MANUAL_ONLY", () => {
    const result = evaluateStudentRecordDeleteEligibility({
      appAccessMode: "MANUAL_ONLY",
      userId: "user-1",
      counts: emptyCounts,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.codes).toContain(STUDENT_DELETE_BLOCK_CODE.HAS_LINKED_USER);
    }
  });

  it("blocks invitations", () => {
    const result = evaluateStudentRecordDeleteEligibility({
      appAccessMode: "MANUAL_ONLY",
      userId: null,
      counts: { ...emptyCounts, userInvitations: 1 },
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe(STUDENT_DELETE_BLOCK_CODE.HAS_INVITATIONS);
    }
  });

  it("blocks lessons (any source)", () => {
    const result = evaluateStudentRecordDeleteEligibility({
      appAccessMode: "MANUAL_ONLY",
      userId: null,
      counts: { ...emptyCounts, lessons: 2 },
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe(STUDENT_DELETE_BLOCK_CODE.HAS_LESSONS);
    }
  });

  it("blocks lesson counters", () => {
    const result = evaluateStudentRecordDeleteEligibility({
      appAccessMode: "MANUAL_ONLY",
      userId: null,
      counts: { ...emptyCounts, lessonCounters: 1 },
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe(STUDENT_DELETE_BLOCK_CODE.HAS_LESSON_COUNTERS);
    }
  });

  it("blocks lesson requests", () => {
    const result = evaluateStudentRecordDeleteEligibility({
      appAccessMode: "MANUAL_ONLY",
      userId: null,
      counts: { ...emptyCounts, lessonRequests: 1 },
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe(STUDENT_DELETE_BLOCK_CODE.HAS_LESSON_REQUESTS);
    }
  });

  it("blocks exam registrations", () => {
    const result = evaluateStudentRecordDeleteEligibility({
      appAccessMode: "MANUAL_ONLY",
      userId: null,
      counts: { ...emptyCounts, examRegistrations: 1 },
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe(
        STUDENT_DELETE_BLOCK_CODE.HAS_EXAM_REGISTRATIONS,
      );
    }
  });

  it("blocks payments", () => {
    const result = evaluateStudentRecordDeleteEligibility({
      appAccessMode: "MANUAL_ONLY",
      userId: null,
      counts: { ...emptyCounts, payments: 1 },
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe(STUDENT_DELETE_BLOCK_CODE.HAS_PAYMENTS);
    }
  });

  it("returns all applicable codes with primary code first", () => {
    const result = evaluateStudentRecordDeleteEligibility({
      appAccessMode: "APP_USER",
      userId: "user-1",
      counts: { ...emptyCounts, lessons: 1, userInvitations: 1 },
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe(STUDENT_DELETE_BLOCK_CODE.NOT_MANUAL_ONLY);
      expect(result.codes.length).toBeGreaterThan(1);
      expect(result.codes).toContain(STUDENT_DELETE_BLOCK_CODE.HAS_LESSONS);
    }
  });
});

describe("canShowStudentRecordDeleteAction", () => {
  it("is true only for MANUAL_ONLY without user", () => {
    expect(
      canShowStudentRecordDeleteAction({
        appAccessMode: "MANUAL_ONLY",
        userId: null,
      }),
    ).toBe(true);
    expect(
      canShowStudentRecordDeleteAction({
        appAccessMode: "INVITED",
        userId: null,
      }),
    ).toBe(false);
    expect(
      canShowStudentRecordDeleteAction({
        appAccessMode: "MANUAL_ONLY",
        userId: "u1",
      }),
    ).toBe(false);
  });
});
