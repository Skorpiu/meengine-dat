
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

/**
 * GET /api/config/features
 * Get feature flags for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const features = await getUserFeatureFlags(
      session?.user?.id,
      session?.user?.role
    );

    return NextResponse.json({
      features,
      userId: session?.user?.id || null,
      userRole: session?.user?.role || null,
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
