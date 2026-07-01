import { prisma } from "@/lib/db";
import { resolveInstructorQualifiedCategoryIds } from "@/lib/instructors/instructor-qualified-categories";

export type InstructorQualifiedCategoriesDto = {
  id: string;
  qualifiedCategories: { id: number; name: string }[];
};

export async function updateInstructorQualifiedCategories(input: {
  organizationId: string;
  instructorId: string;
  qualifiedCategoryNames: string[];
}): Promise<
  | { ok: true; instructor: InstructorQualifiedCategoriesDto }
  | { ok: false; notFound: true }
  | {
      ok: false;
      notFound?: false;
      error: "category_not_found";
      categoryName: string;
    }
> {
  const existing = await prisma.instructor.findFirst({
    where: {
      id: input.instructorId,
      organizationId: input.organizationId,
    },
    select: { id: true },
  });

  if (!existing) {
    return { ok: false, notFound: true };
  }

  const resolved = await resolveInstructorQualifiedCategoryIds(
    input.qualifiedCategoryNames,
  );

  if (!resolved.ok) {
    return {
      ok: false,
      error: resolved.error,
      categoryName: resolved.categoryName,
    };
  }

  const instructor = await prisma.instructor.update({
    where: { id: existing.id },
    data: {
      qualifiedCategories: {
        set: resolved.categoryIds.map((id) => ({ id })),
      },
    },
    select: {
      id: true,
      qualifiedCategories: {
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
    },
  });

  return { ok: true, instructor };
}
