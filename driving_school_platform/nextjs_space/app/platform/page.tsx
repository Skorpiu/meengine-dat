import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getRequestHost, isLocalHost, isPlatformHost, resolveOrganizationIdFromHost } from '@/lib/tenant';
import PlatformDashboard from '@/components/platform/platform-dashboard';

export default async function PlatformPage({ }: { }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect('/auth/login');
  if (session.user.role !== 'PLATFORM_ADMIN') notFound();

  const host = getRequestHost({ headers: headers() });
  if (!isLocalHost(host) && !isPlatformHost(host)) notFound();
  if (host) {
    const mappedOrgId = await resolveOrganizationIdFromHost(host);
    if (mappedOrgId) notFound();
  }

  // This page should not be used on tenant domains
  // (platform host must NOT be mapped in organization_domains)
  // We can’t access request headers easily here without extra plumbing, so we enforce it on the API.
  const orgs = await db.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: { domains: { orderBy: { isPrimary: 'desc' } } },
  });

  return <PlatformDashboard initialOrganizations={orgs} />;
}
