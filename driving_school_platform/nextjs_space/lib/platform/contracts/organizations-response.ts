import type { Prisma } from "@prisma/client";

export type PlatformOrganizationDomainDto = {
  id: string;
  host: string;
  isPrimary: boolean;
};

export type PlatformOrganizationDto = {
  id: string;
  name: string;
  createdAt: string | Date;
  domains: PlatformOrganizationDomainDto[];
};

export type PlatformOrganizationsGetResponse = {
  organizations: PlatformOrganizationDto[];
};

export type PlatformOrganizationsPostResponse = {
  message: "Organization created";
  organizationId: string;
  primaryHost: string;
  hosts: string[];
  schoolAdmin: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  licenseKey: string | null;
};

export type ListOrganizationsQueryResult = Prisma.OrganizationGetPayload<{
  include: { domains: { orderBy: { isPrimary: "desc" } } };
}>;

export function toPlatformOrganizationDto(
  org: ListOrganizationsQueryResult,
): PlatformOrganizationDto {
  return {
    id: org.id,
    name: org.name,
    createdAt: org.createdAt.toISOString(),
    domains: org.domains.map((d) => ({
      id: d.id,
      host: d.host,
      isPrimary: d.isPrimary,
    })),
  };
}

export function toPlatformOrganizationsGetResponse(
  orgs: ListOrganizationsQueryResult[],
): PlatformOrganizationsGetResponse {
  return { organizations: orgs.map(toPlatformOrganizationDto) };
}

export function toPlatformOrganizationsPostResponse(input: {
  organizationId: string;
  primaryHost: string;
  hosts: string[];
  schoolAdmin: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  licenseKey: string | null;
}): PlatformOrganizationsPostResponse {
  return {
    message: "Organization created",
    organizationId: input.organizationId,
    primaryHost: input.primaryHost,
    hosts: input.hosts,
    schoolAdmin: input.schoolAdmin,
    licenseKey: input.licenseKey,
  };
}
