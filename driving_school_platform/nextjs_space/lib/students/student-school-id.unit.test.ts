import { describe, it, expect } from "vitest";
import {
  buildSchoolStudentId,
  isValidCanonicalSchoolStudentId,
  normalizeSchoolStudentIdSearchQuery,
  parseCanonicalSchoolStudentId,
} from "./student-school-id";

describe("buildSchoolStudentId", () => {
  it('builds "26001" from year 26 and sequence 1', () => {
    expect(buildSchoolStudentId("26", 1)).toEqual({ ok: true, value: "26001" });
  });

  it('builds "26012" from year 26 and sequence 12', () => {
    expect(buildSchoolStudentId("26", 12)).toEqual({
      ok: true,
      value: "26012",
    });
  });

  it('builds "26078" from year 26 and sequence 78', () => {
    expect(buildSchoolStudentId("26", 78)).toEqual({
      ok: true,
      value: "26078",
    });
  });

  it('builds "26123" from year 26 and sequence 123', () => {
    expect(buildSchoolStudentId("26", 123)).toEqual({
      ok: true,
      value: "26123",
    });
  });

  it("rejects invalid yearSuffix", () => {
    expect(buildSchoolStudentId("2", 1).ok).toBe(false);
    expect(buildSchoolStudentId("260", 1).ok).toBe(false);
    expect(buildSchoolStudentId("ab", 1).ok).toBe(false);
  });

  it("rejects sequence 0", () => {
    expect(buildSchoolStudentId("26", 0).ok).toBe(false);
  });

  it("rejects sequence > 999", () => {
    expect(buildSchoolStudentId("26", 1000).ok).toBe(false);
  });

  it("rejects non-integer sequence", () => {
    expect(buildSchoolStudentId("26", 1.5).ok).toBe(false);
  });
});

describe("parseCanonicalSchoolStudentId", () => {
  it("parses 26001", () => {
    expect(parseCanonicalSchoolStudentId("26001")).toEqual({
      ok: true,
      value: {
        canonicalId: "26001",
        yearSuffix: "26",
        sequenceText: "001",
        sequenceNumber: 1,
      },
    });
  });

  it("parses 26012", () => {
    expect(parseCanonicalSchoolStudentId("26012").ok).toBe(true);
  });

  it("parses 26078", () => {
    expect(parseCanonicalSchoolStudentId("26078").ok).toBe(true);
  });

  it("parses 26123", () => {
    expect(parseCanonicalSchoolStudentId("26123").ok).toBe(true);
  });

  it("trims input", () => {
    expect(parseCanonicalSchoolStudentId("  26001  ").ok).toBe(true);
  });

  it("rejects 26000 (sequence 000)", () => {
    expect(parseCanonicalSchoolStudentId("26000").ok).toBe(false);
  });

  it("rejects 2601 (not 5 digits)", () => {
    expect(parseCanonicalSchoolStudentId("2601").ok).toBe(false);
  });

  it("rejects 260001 (too long)", () => {
    expect(parseCanonicalSchoolStudentId("260001").ok).toBe(false);
  });

  it("rejects 26-001 (non-digits)", () => {
    expect(parseCanonicalSchoolStudentId("26-001").ok).toBe(false);
  });

  it("rejects abc12", () => {
    expect(parseCanonicalSchoolStudentId("abc12").ok).toBe(false);
  });
});

describe("normalizeSchoolStudentIdSearchQuery", () => {
  it('normalizes "261" to "26001"', () => {
    expect(normalizeSchoolStudentIdSearchQuery("261")).toEqual({
      ok: true,
      value: "26001",
    });
  });

  it('normalizes "2678" to "26078"', () => {
    expect(normalizeSchoolStudentIdSearchQuery("2678")).toEqual({
      ok: true,
      value: "26078",
    });
  });

  it('keeps "26078" as "26078"', () => {
    expect(normalizeSchoolStudentIdSearchQuery("26078")).toEqual({
      ok: true,
      value: "26078",
    });
  });

  it('rejects "260" because sequence is 0', () => {
    expect(normalizeSchoolStudentIdSearchQuery("260").ok).toBe(false);
  });

  it('accepts "26999"', () => {
    expect(normalizeSchoolStudentIdSearchQuery("26999")).toEqual({
      ok: true,
      value: "26999",
    });
  });

  it('rejects "261000" (too long)', () => {
    expect(normalizeSchoolStudentIdSearchQuery("261000").ok).toBe(false);
  });

  it('rejects "26-1"', () => {
    expect(normalizeSchoolStudentIdSearchQuery("26-1").ok).toBe(false);
  });

  it('rejects "abc"', () => {
    expect(normalizeSchoolStudentIdSearchQuery("abc").ok).toBe(false);
  });
});

describe("isValidCanonicalSchoolStudentId", () => {
  it("returns true for 26001", () => {
    expect(isValidCanonicalSchoolStudentId("26001")).toBe(true);
  });

  it("returns false for 2601", () => {
    expect(isValidCanonicalSchoolStudentId("2601")).toBe(false);
  });

  it("returns false for 26000", () => {
    expect(isValidCanonicalSchoolStudentId("26000")).toBe(false);
  });

  it("returns false for 260001", () => {
    expect(isValidCanonicalSchoolStudentId("260001")).toBe(false);
  });
});
