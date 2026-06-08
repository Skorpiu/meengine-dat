import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const ADMIN_USERS_PAGE_ROLES = ["STUDENT", "INSTRUCTOR"] as const;

const adminUsersPageInclude = {
  student: {
    include: {
      category: true,
      transmissionType: true,
    },
  },
  instructor: true,
} satisfies Prisma.UserInclude;

export type AdminUsersPageUser = ReturnType<typeof serializeAdminUsersPageUser>;

type UserWithRelations = Prisma.UserGetPayload<{
  include: typeof adminUsersPageInclude;
}>;

export function serializeAdminUsersPageUser(user: UserWithRelations) {
  return {
    ...user,
    instructor: user.instructor
      ? {
          ...user.instructor,
          hourlyRate: user.instructor.hourlyRate
            ? Number(user.instructor.hourlyRate)
            : null,
          averageRating: user.instructor.averageRating
            ? Number(user.instructor.averageRating)
            : null,
          passRatePercentage: user.instructor.passRatePercentage
            ? Number(user.instructor.passRatePercentage)
            : null,
        }
      : null,
  };
}

export async function loadAdminUsersPageData(organizationId: string) {
  const [usersRaw, categories, transmissionTypes] = await Promise.all([
    prisma.user.findMany({
      where: {
        organizationId,
        role: { in: [...ADMIN_USERS_PAGE_ROLES] },
      },
      include: adminUsersPageInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.transmissionType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    users: usersRaw.map(serializeAdminUsersPageUser),
    categories,
    transmissionTypes,
  };
}
