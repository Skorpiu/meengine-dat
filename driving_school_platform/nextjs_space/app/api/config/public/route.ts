
/**
 * Public Configuration API
 * Returns public settings and feature flags
 * @route /api/config/public
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPublicSettings } from '@/lib/config-utils';
import { HTTP_STATUS } from '@/lib/constants';

/**
 * GET /api/config/public
 * Get all public configuration settings
 */
export async function GET(request: NextRequest) {
  try {
    const settings = await getPublicSettings();

    return NextResponse.json({
      settings,
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
