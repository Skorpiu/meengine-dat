import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { upsertPlatformAdmin } from "../lib/platform/platform-admins";

const prisma = new PrismaClient();

async function main() {
  const user = await upsertPlatformAdmin(prisma, {
    email: process.env.PLATFORM_ADMIN_EMAIL ?? "",
    password: process.env.PLATFORM_ADMIN_PASSWORD ?? "",
    firstName: process.env.PLATFORM_ADMIN_FIRST_NAME,
    lastName: process.env.PLATFORM_ADMIN_LAST_NAME,
  });

  console.log("✅ PLATFORM_ADMIN ready:", user);
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
