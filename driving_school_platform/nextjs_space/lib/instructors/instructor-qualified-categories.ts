import { prisma } from "@/lib/db";

export function normalizeInstructorQualifiedCategoryNames(
  raw: unknown,
): string[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const seen = new Set<string>();
  const names: string[] = [];

  for (const entry of raw) {
    if (typeof entry !== "string") {
      return null;
    }
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    if (seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    names.push(trimmed);
  }

  return names;
}

export async function resolveInstructorQualifiedCategoryIds(
  categoryNames: string[],
): Promise<
  | { ok: true; categoryIds: number[] }
  | { ok: false; error: "category_not_found"; categoryName: string }
> {
  const categoryIds: number[] = [];

  for (const name of categoryNames) {
    const category = await prisma.category.findFirst({
      where: { name, isActive: true },
      select: { id: true },
    });

    if (!category) {
      return { ok: false, error: "category_not_found", categoryName: name };
    }

    categoryIds.push(category.id);
  }

  return { ok: true, categoryIds };
}
