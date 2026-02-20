import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { HTTP_STATUS, API_MESSAGES } from '@/lib/constants';
import { resolveTenantOrganizationId } from '@/lib/tenant';
import { LicenseService } from '@/lib/services/license-service';
import { FEATURE_DEFINITIONS, type FeatureKey } from '@/lib/config/license-features';

import { z } from 'zod';

function parseHost(raw: string): string {
  let h = raw.trim().toLowerCase();
  h = h.replace(/^https?:\/\//, '');
  h = h.split('/')[0] ?? '';
  h = h.replace(/:\d+$/, '');
  return h;
}

const FEATURE_KEYS = Object.keys(FEATURE_DEFINITIONS) as [FeatureKey, ...FeatureKey[]];

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

    if (!session?.user || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ error: API_MESSAGES.UNAUTHORIZED }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    // Hard rule: platform APIs must NOT run on a tenant-mapped host
    const tenant = await resolveTenantOrganizationId(request);
    if (tenant.organizationId) {
      return NextResponse.json({ error: 'Platform endpoint not allowed on tenant domains' }, { status: HTTP_STATUS.FORBIDDEN });
    }

    const orgs = await db.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        domains: { orderBy: { isPrimary: 'desc' } },
      },
    });

    return NextResponse.json({ organizations: orgs }, { status: HTTP_STATUS.OK });
  } catch (error) {
    console.error('Error listing organizations:', error);
    return NextResponse.json({ error: API_MESSAGES.FETCH_ERROR }, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ error: API_MESSAGES.UNAUTHORIZED }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    // Hard rule: platform APIs must NOT run on a tenant-mapped host
    const tenant = await resolveTenantOrganizationId(request);
    if (tenant.organizationId) {
      return NextResponse.json({ error: 'Platform endpoint not allowed on tenant domains' }, { status: HTTP_STATUS.FORBIDDEN });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: API_MESSAGES.INVALID_REQUEST }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    const parsed = onboardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const data = parsed.data;

    const hosts = Array.from(new Set(data.hosts.map(parseHost)));
    const primaryHost = parseHost(data.primaryHost);

    if (!hosts.includes(primaryHost)) {
      return NextResponse.json({ error: 'primaryHost must be included in hosts' }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    // Reject obvious bad hosts
    for (const h of hosts) {
      if (!h || h.includes(' ') || h.includes('/') || !h.includes('.')) {
        return NextResponse.json({ error: `Invalid host: ${h}` }, { status: HTTP_STATUS.BAD_REQUEST });
      }
    }

    // Guard against domain collisions
    const existingDomains = await db.organizationDomain.findMany({
      where: { host: { in: hosts } },
      select: { host: true, organizationId: true },
    });

    if (existingDomains.length > 0) {
      return NextResponse.json(
        { error: 'One or more domains already exist', details: { domains: existingDomains.map(d => d.host).join(', ') } },
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    // Guard against email collisions
    const existingUser = await db.user.findUnique({
      where: { email: data.superAdminEmail.toLowerCase() },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Super admin email already exists' }, { status: HTTP_STATUS.CONFLICT });
    }

    const passwordHash = await bcrypt.hash(data.superAdminPassword, 12);

    const result = await db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: data.name,
        },
      });

      await tx.organizationDomain.createMany({
        data: hosts.map((h) => ({
          organizationId: org.id,
          host: h,
          isPrimary: h === primaryHost,
        })),
      });

      const superAdmin = await tx.user.create({
        data: {
          email: data.superAdminEmail.toLowerCase(),
          passwordHash,
          role: 'SUPER_ADMIN',
          firstName: data.superAdminFirstName,
          lastName: data.superAdminLastName,
          isApproved: true,
          isEmailVerified: true,
          emailVerified: new Date(),
          organizationId: org.id,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      const expiresAt = data.licenseExpiresAt ? new Date(data.licenseExpiresAt) : undefined;

      const license = await LicenseService.createLicenseKey(
        org.id,
        data.licenseFeatureKeys,
        expiresAt,
        data.licenseNotes,
        session.user.id
      );

      return { org, superAdmin, licenseKey: license.key ?? null };
    });

    return NextResponse.json(
      {
        message: 'Organization created',
        organizationId: result.org.id,
        primaryHost,
        hosts,
        superAdmin: result.superAdmin,
        licenseKey: result.licenseKey,
      },
      { status: HTTP_STATUS.CREATED }
    );
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ error: API_MESSAGES.CREATE_ERROR }, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR });
  }
}
