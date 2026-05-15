/**
 * Pure helpers for demo practical (DRIVING) lesson readiness.
 * Driving lessons require the instructor to have at least one qualified category
 * (see lesson-create-service).
 */

export type DrivingCategoryRef = {
  id: number;
  name: string;
  fullName: string;
  isActive: boolean;
  displayOrder: number;
};

export function resolveDrivingCategory(
  categories: DrivingCategoryRef[],
  opts: { code?: string; name?: string },
): { category: DrivingCategoryRef } | { error: string } {
  const active = categories.filter((c) => c.isActive);
  if (active.length === 0) {
    return { error: "No active categories in the database." };
  }

  const code = opts.code?.trim();
  const nameHint = opts.name?.trim();

  if (code) {
    const hit = active.find((c) => c.name.toLowerCase() === code.toLowerCase());
    if (!hit) {
      return {
        error: `No active category with short name/code "${code}" (Category.name).`,
      };
    }
    return { category: hit };
  }

  if (nameHint) {
    const lower = nameHint.toLowerCase();
    const hit = active.find(
      (c) =>
        c.name.toLowerCase() === lower || c.fullName.toLowerCase() === lower,
    );
    if (!hit) {
      return {
        error: `No active category matching DEMO_DRIVING_CATEGORY_NAME "${nameHint}".`,
      };
    }
    return { category: hit };
  }

  const preferred = active.find((c) => c.name === "B");
  if (preferred) {
    return { category: preferred };
  }

  const sorted = [...active].sort((a, b) => a.displayOrder - b.displayOrder);
  return { category: sorted[0]! };
}

export type PracticalReadinessPlan = {
  categoryId: number;
  categoryLabel: string;
  instructorAlreadyQualified: boolean;
  linkInstructor: boolean;
  vehicleId: number | null;
  vehicleCategoryAligned: boolean;
  updateVehicleCategory: boolean;
};

export function planPracticalReadiness(input: {
  targetCategory: DrivingCategoryRef;
  instructorCategoryIds: number[];
  vehicle: { id: number; categoryId: number | null } | null;
}): PracticalReadinessPlan {
  const instructorAlreadyQualified = input.instructorCategoryIds.includes(
    input.targetCategory.id,
  );

  let vehicleCategoryAligned = true;
  let updateVehicleCategory = false;
  if (input.vehicle) {
    vehicleCategoryAligned =
      input.vehicle.categoryId === input.targetCategory.id;
    if (!vehicleCategoryAligned) {
      updateVehicleCategory = true;
    }
  }

  return {
    categoryId: input.targetCategory.id,
    categoryLabel: `${input.targetCategory.name} (${input.targetCategory.fullName})`,
    instructorAlreadyQualified,
    linkInstructor: !instructorAlreadyQualified,
    vehicleId: input.vehicle?.id ?? null,
    vehicleCategoryAligned,
    updateVehicleCategory,
  };
}

/** True when client-ready should warn that practical driving lessons may fail. */
export function instructorNeedsPracticalCategoryLink(
  qualifiedCategoryCount: number,
): boolean {
  return qualifiedCategoryCount === 0;
}
