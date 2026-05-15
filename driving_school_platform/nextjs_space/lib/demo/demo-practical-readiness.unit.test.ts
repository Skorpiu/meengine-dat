import { describe, it, expect } from "vitest";
import {
  instructorNeedsPracticalCategoryLink,
  planPracticalReadiness,
  resolveDrivingCategory,
  type DrivingCategoryRef,
} from "./demo-practical-readiness";

const categories: DrivingCategoryRef[] = [
  {
    id: 1,
    name: "AM",
    fullName: "Moped",
    isActive: true,
    displayOrder: 1,
  },
  {
    id: 2,
    name: "B",
    fullName: "Car",
    isActive: true,
    displayOrder: 6,
  },
  {
    id: 3,
    name: "C",
    fullName: "Truck",
    isActive: false,
    displayOrder: 7,
  },
];

describe("resolveDrivingCategory", () => {
  it("prefers category B when no hint is given", () => {
    const r = resolveDrivingCategory(categories, {});
    expect("category" in r && r.category.name).toBe("B");
  });

  it("resolves by short name code", () => {
    const r = resolveDrivingCategory(categories, { code: "am" });
    expect("category" in r && r.category.id).toBe(1);
  });

  it("resolves by full name hint", () => {
    const r = resolveDrivingCategory(categories, { name: "Car" });
    expect("category" in r && r.category.id).toBe(2);
  });

  it("errors when no active categories exist", () => {
    const r = resolveDrivingCategory(
      [{ ...categories[2]!, isActive: false }],
      {},
    );
    expect("error" in r).toBe(true);
  });
});

describe("planPracticalReadiness", () => {
  it("links instructor when not yet qualified", () => {
    const plan = planPracticalReadiness({
      targetCategory: categories[1]!,
      instructorCategoryIds: [],
      vehicle: null,
    });
    expect(plan.linkInstructor).toBe(true);
    expect(plan.instructorAlreadyQualified).toBe(false);
  });

  it("skips instructor link when already qualified", () => {
    const plan = planPracticalReadiness({
      targetCategory: categories[1]!,
      instructorCategoryIds: [2],
      vehicle: { id: 10, categoryId: 2 },
    });
    expect(plan.linkInstructor).toBe(false);
    expect(plan.updateVehicleCategory).toBe(false);
  });

  it("plans vehicle category alignment when mismatched", () => {
    const plan = planPracticalReadiness({
      targetCategory: categories[1]!,
      instructorCategoryIds: [2],
      vehicle: { id: 10, categoryId: 1 },
    });
    expect(plan.updateVehicleCategory).toBe(true);
    expect(plan.vehicleCategoryAligned).toBe(false);
  });
});

describe("instructorNeedsPracticalCategoryLink", () => {
  it("is true only when count is zero", () => {
    expect(instructorNeedsPracticalCategoryLink(0)).toBe(true);
    expect(instructorNeedsPracticalCategoryLink(1)).toBe(false);
  });
});
