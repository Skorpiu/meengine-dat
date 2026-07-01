import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  instructorFindFirstMock: vi.fn(),
  instructorUpdateMock: vi.fn(),
  resolveQualifiedCategoryIdsMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    instructor: {
      findFirst: h.instructorFindFirstMock,
      update: h.instructorUpdateMock,
    },
  },
}));

vi.mock("@/lib/instructors/instructor-qualified-categories", () => ({
  resolveInstructorQualifiedCategoryIds: h.resolveQualifiedCategoryIdsMock,
}));

import { updateInstructorQualifiedCategories } from "./instructor-record-qualified-categories";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("updateInstructorQualifiedCategories", () => {
  it("returns notFound when instructor is outside tenant", async () => {
    h.instructorFindFirstMock.mockResolvedValue(null);

    const result = await updateInstructorQualifiedCategories({
      organizationId: "org-a",
      instructorId: "inst-1",
      qualifiedCategoryNames: ["B"],
    });

    expect(result).toEqual({ ok: false, notFound: true });
    expect(h.instructorUpdateMock).not.toHaveBeenCalled();
  });

  it("replaces qualified categories with set", async () => {
    h.instructorFindFirstMock.mockResolvedValue({ id: "inst-1" });
    h.resolveQualifiedCategoryIdsMock.mockResolvedValue({
      ok: true,
      categoryIds: [2, 5],
    });
    h.instructorUpdateMock.mockResolvedValue({
      id: "inst-1",
      qualifiedCategories: [
        { id: 2, name: "B" },
        { id: 5, name: "C1" },
      ],
    });

    const result = await updateInstructorQualifiedCategories({
      organizationId: "org-a",
      instructorId: "inst-1",
      qualifiedCategoryNames: ["B", "C1"],
    });

    expect(result.ok).toBe(true);
    expect(h.instructorUpdateMock).toHaveBeenCalledWith({
      where: { id: "inst-1" },
      data: {
        qualifiedCategories: {
          set: [{ id: 2 }, { id: 5 }],
        },
      },
      select: expect.objectContaining({
        id: true,
        qualifiedCategories: expect.any(Object),
      }),
    });
  });

  it("propagates category_not_found from resolver", async () => {
    h.instructorFindFirstMock.mockResolvedValue({ id: "inst-1" });
    h.resolveQualifiedCategoryIdsMock.mockResolvedValue({
      ok: false,
      error: "category_not_found",
      categoryName: "ZZZ",
    });

    const result = await updateInstructorQualifiedCategories({
      organizationId: "org-a",
      instructorId: "inst-1",
      qualifiedCategoryNames: ["ZZZ"],
    });

    expect(result).toEqual({
      ok: false,
      error: "category_not_found",
      categoryName: "ZZZ",
    });
    expect(h.instructorUpdateMock).not.toHaveBeenCalled();
  });
});
