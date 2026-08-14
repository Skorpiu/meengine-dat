import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRequestHost, resolveOrganizationIdFromHost } from "@/lib/tenant";
import PlatformDashboard from "@/components/platform/platform-dashboard";
import { toPlatformOrganizationDto } from "@/lib/platform/contracts/organizations-response";
import { decidePlatformSurfaceAccess } from "@/lib/platform/access-policy";

export default async function PlatformPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/auth/login");
  const host = getRequestHost({ headers: await headers() });

  const mappedOrgId = host ? await resolveOrganizationIdFromHost(host) : null;
  const access = decidePlatformSurfaceAccess({
    mode: "page",
    userRole: session.user.role,
    host,
    tenantOrganizationId: mappedOrgId,
  });
  if (!access.allowed) notFound();

  // This page should not be used on tenant domains
  // (platform host must NOT be mapped in organization_domains)
  // We can’t access request headers easily here without extra plumbing, so we enforce it on the API.
  const orgs = await db.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: { domains: { orderBy: { isPrimary: "desc" } } },
  });

  const initialOrganizations = orgs.map(toPlatformOrganizationDto);

  return <PlatformDashboard initialOrganizations={initialOrganizations} />;
}
