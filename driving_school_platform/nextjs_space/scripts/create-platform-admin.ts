import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.PLATFORM_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('Missing PLATFORM_ADMIN_EMAIL or PLATFORM_ADMIN_PASSWORD');
  }

  const firstName = process.env.PLATFORM_ADMIN_FIRST_NAME?.trim() || 'Platform';
  const lastName = process.env.PLATFORM_ADMIN_LAST_NAME?.trim() || 'Admin';

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      role: 'PLATFORM_ADMIN',
      firstName,
      lastName,
      isApproved: true,
      isEmailVerified: true,
      emailVerified: new Date(),
      organizationId: null,
    },
    update: {
      passwordHash,
      role: 'PLATFORM_ADMIN',
      isApproved: true,
      isEmailVerified: true,
      emailVerified: new Date(),
      organizationId: null,
    },
    select: { id: true, email: true, role: true },
  });

  console.log('✅ PLATFORM_ADMIN ready:', user);
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });