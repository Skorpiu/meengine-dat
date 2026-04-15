import { db } from "@/lib/db";

export async function listPlatformOrganizations() {
  return await db.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      domains: { orderBy: { isPrimary: "desc" } },
    },
  });
}
