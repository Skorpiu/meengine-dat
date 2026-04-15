import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { HTTP_STATUS, API_MESSAGES } from "@/lib/constants";
import {
  resolveTenantOrganizationId,
  isLocalHost,
  isPlatformHost,
} from "@/lib/tenant";
import {
  FEATURE_DEFINITIONS,
  type FeatureKey,
} from "@/lib/config/license-features";
import { onboardOrganization } from "@/lib/platform/onboard-organization";

import { z } from "zod";

const FEATURE_KEYS = Object.keys(FEATURE_DEFINITIONS) as [
  FeatureKey,
  ...FeatureKey[],
];

const onboardSchema = z.object({
  name: z.string().min(2),
  hosts: z.array(z.string().min(3)).min(1),
  primaryHost: z.string().min(3),
  superAdminEmail: z.string().email(),
  superAdminPassword: z.string().min(8),
  superAdminFirstName: z.string().min(1),
  superAdminLastName: z.string().min(1),
  licenseFeatureKeys: z.array(z.enum(FEATURE_KEYS)).min(1),
  licenseNotes: z.string().optional(),
  licenseExpiresAt: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json(
        { error: API_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED },
      );
    }

    // Hard rule: platform APIs must NOT run on a tenant-mapped host
    const tenant = await resolveTenantOrganizationId(request);
    if (!tenant.host) {
      return NextResponse.json(
        { error: API_MESSAGES.INVALID_REQUEST },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }
    if (tenant.organizationId) {
      return NextResponse.json(
        { error: "Platform endpoint not allowed on tenant domains" },
        { status: HTTP_STATUS.FORBIDDEN },
      );
    }

    // Hard rule: platform APIs must run ONLY on local dev or platform hosts (avoid random/unmapped hosts)
    if (!isLocalHost(tenant.host) && !isPlatformHost(tenant.host)) {
      return NextResponse.json(
        { error: "Platform endpoint not allowed on this host" },
        { status: HTTP_STATUS.FORBIDDEN },
      );
    }

    const orgs = await db.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        domains: { orderBy: { isPrimary: "desc" } },
      },
    });

    return NextResponse.json(
      { organizations: orgs },
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    console.error("Error listing organizations:", error);
    return NextResponse.json(
      { error: API_MESSAGES.FETCH_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json(
        { error: API_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED },
      );
    }

    // Hard rule: platform APIs must NOT run on a tenant-mapped host
    const tenant = await resolveTenantOrganizationId(request);
    if (!tenant.host) {
      return NextResponse.json(
        { error: API_MESSAGES.INVALID_REQUEST },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }
    if (tenant.organizationId) {
      return NextResponse.json(
        { error: "Platform endpoint not allowed on tenant domains" },
        { status: HTTP_STATUS.FORBIDDEN },
      );
    }

    // Hard rule: platform APIs must run ONLY on local dev or platform hosts (avoid random/unmapped hosts)
    if (!isLocalHost(tenant.host) && !isPlatformHost(tenant.host)) {
      return NextResponse.json(
        { error: "Platform endpoint not allowed on this host" },
        { status: HTTP_STATUS.FORBIDDEN },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: API_MESSAGES.INVALID_REQUEST },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const parsed = onboardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const data = parsed.data;

    const result = await onboardOrganization(data, {
      createdByUserId: session.user.id,
    });

    if (!result.ok) {
      return NextResponse.json(result.body, { status: result.status });
    }

    return NextResponse.json(
      {
        message: "Organization created",
        organizationId: result.value.organizationId,
        primaryHost: result.value.primaryHost,
        hosts: result.value.hosts,
        superAdmin: result.value.superAdmin,
        licenseKey: result.value.licenseKey,
      },
      { status: HTTP_STATUS.CREATED },
    );
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: API_MESSAGES.CREATE_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}
