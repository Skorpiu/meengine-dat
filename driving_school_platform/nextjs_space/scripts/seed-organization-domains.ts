import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeHost(raw: string): string {
  return raw.toLowerCase().trim().replace(/:\d+$/, '');
}

async function main() {
  const orgIdFromEnv = process.env.TENANT_ORG_ID?.trim() || null;
  const org =
    orgIdFromEnv
      ? await prisma.organization.findUnique({ where: { id: orgIdFromEnv } })
      : await prisma.organization.findFirst();

  if (!org) throw new Error('No organization found (create one first).');

  const hostsRaw = process.env.TENANT_HOSTS?.split(',').map(s => s.trim()).filter(Boolean) ?? [];
  if (hostsRaw.length === 0) {
    throw new Error('Set TENANT_HOSTS (comma-separated), e.g. "www.meengine.io,meengine-dat.vercel.app"');
  }

  const primary = process.env.TENANT_PRIMARY_HOST ? normalizeHost(process.env.TENANT_PRIMARY_HOST) : null;

  for (const h of hostsRaw) {
    const host = normalizeHost(h);

    await prisma.organizationDomain.upsert({
      where: { host },
      create: {
        host,
        organizationId: org.id,
        isPrimary: primary ? host === primary : false,
      },
      update: {
        organizationId: org.id,
        isPrimary: primary ? host === primary : false,
      },
    });

    console.log(`✅ ${host} → ${org.id}`);
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
