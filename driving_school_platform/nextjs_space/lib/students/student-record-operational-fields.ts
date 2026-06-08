import { prisma } from "@/lib/db";

export type StudentOperationalFieldIds = {
  categoryId?: number | null;
  transmissionTypeId?: number | null;
};

export async function resolveStudentOperationalFieldIds(input: {
  categoryName?: string | null;
  transmissionTypeName?: string | null;
}): Promise<
  | { ok: true; fields: StudentOperationalFieldIds }
  | { ok: false; error: string }
> {
  const fields: StudentOperationalFieldIds = {};

  if (input.categoryName !== undefined) {
    const trimmed = input.categoryName?.trim() ?? "";
    if (!trimmed) {
      fields.categoryId = null;
    } else {
      const category = await prisma.category.findFirst({
        where: { name: trimmed },
        select: { id: true },
      });
      if (!category) {
        return { ok: false, error: "category_not_found" };
      }
      fields.categoryId = category.id;
    }
  }

  if (input.transmissionTypeName !== undefined) {
    const trimmed = input.transmissionTypeName?.trim() ?? "";
    if (!trimmed) {
      fields.transmissionTypeId = null;
    } else {
      const transmission = await prisma.transmissionType.findFirst({
        where: { name: trimmed },
        select: { id: true },
      });
      if (!transmission) {
        return { ok: false, error: "transmission_type_not_found" };
      }
      fields.transmissionTypeId = transmission.id;
    }
  }

  return { ok: true, fields };
}
