
/**
 * Feature Flags Check API
 * Check which features are enabled for the current user
 * @route /api/config/features
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserFeatureFlags } from '@/lib/config-utils';
import { HTTP_STATUS } from '@/lib/constants';
import { resolveTenantOrganizationId } from '@/lib/tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/config/features
 * Get feature flags for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // If not authenticated, return empty feature set (non-breaking behavior)
    if (!session?.user) {
      return NextResponse.json({
        features: {},
        userId: null,
        userRole: null,
        organizationId: null,
        timestamp: new Date().toISOString(),
      });
    }

    const orgId = session.user.organizationId;
    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const tenant = await resolveTenantOrganizationId(request);
    if (tenant.organizationId && tenant.organizationId !== orgId) {
      return NextResponse.json(
        { error: 'Organization does not match this domain' },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const features = await getUserFeatureFlags(
      session.user.id,
      session.user.role,
      orgId
    );

    return NextResponse.json({
      features,
      userId: session?.user?.id || null,
      userRole: session?.user?.role || null,
      organizationId: session?.user?.organizationId || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature flags' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
