import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  categoryFindFirstMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    category: {
      findFirst: h.categoryFindFirstMock,
    },
  },
}));

import {
  normalizeInstructorQualifiedCategoryNames,
  resolveInstructorQualifiedCategoryIds,
} from "./instructor-qualified-categories";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("normalizeInstructorQualifiedCategoryNames", () => {
  it("trims, dedupes, and drops empty strings", () => {
    expect(
      normalizeInstructorQualifiedCategoryNames([" B ", "B", "A1", "  "]),
    ).toEqual(["B", "A1"]);
  });

  it("returns empty array for empty input", () => {
    expect(normalizeInstructorQualifiedCategoryNames([])).toEqual([]);
  });

  it("returns null for non-array input", () => {
    expect(normalizeInstructorQualifiedCategoryNames("B")).toBeNull();
    expect(normalizeInstructorQualifiedCategoryNames(null)).toBeNull();
  });

  it("returns null when any entry is not a string", () => {
    expect(normalizeInstructorQualifiedCategoryNames(["B", 1])).toBeNull();
  });
});

describe("resolveInstructorQualifiedCategoryIds", () => {
  it("resolves active categories by name", async () => {
    h.categoryFindFirstMock
      .mockResolvedValueOnce({ id: 2 })
      .mockResolvedValueOnce({ id: 5 });

    const result = await resolveInstructorQualifiedCategoryIds(["B", "A1"]);

    expect(result).toEqual({ ok: true, categoryIds: [2, 5] });
    expect(h.categoryFindFirstMock).toHaveBeenCalledWith({
      where: { name: "B", isActive: true },
      select: { id: true },
    });
  });

  it("fails when category is missing or inactive", async () => {
    h.categoryFindFirstMock.mockResolvedValueOnce(null);

    const result = await resolveInstructorQualifiedCategoryIds(["ZZZ"]);

    expect(result).toEqual({
      ok: false,
      error: "category_not_found",
      categoryName: "ZZZ",
    });
  });

  it("allows empty list to clear categories", async () => {
    const result = await resolveInstructorQualifiedCategoryIds([]);
    expect(result).toEqual({ ok: true, categoryIds: [] });
    expect(h.categoryFindFirstMock).not.toHaveBeenCalled();
  });
});
