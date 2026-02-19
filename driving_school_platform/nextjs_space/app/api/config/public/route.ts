
/**
 * Public Configuration API
 * Returns public settings and feature flags
 * @route /api/config/public
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPublicSettings } from '@/lib/config-utils';
import { HTTP_STATUS } from '@/lib/constants';
import { resolveTenantOrganizationId } from '@/lib/tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/config/public
 * Get all public configuration settings
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await resolveTenantOrganizationId(request);

    if (!tenant.host) {
      return NextResponse.json(
        { error: 'No host provided' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
    const isLocal = LOCAL_HOSTS.has(tenant.host) || tenant.host.endsWith('.localhost');

    // In production: host must map to an org. In local dev: allow empty (non-breaking).
    if (!tenant.organizationId) {
      if (!isLocal) {
        return NextResponse.json(
          { error: 'No organization found for this domain' },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      return NextResponse.json({
        settings: {},
        organizationId: null,
        host: tenant.host,
        timestamp: new Date().toISOString(),
      });
    }

    const settings = await getPublicSettings(tenant.organizationId);

    return NextResponse.json({
      settings,
      organizationId: tenant.organizationId,
      host: tenant.host,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching public config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch public configuration' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
