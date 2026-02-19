
/**
 * User Preferences API
 * @route /api/user/preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { userPreferencesSchema } from '@/lib/config-validation';
import { getUserPreferences, updateUserPreferences, logConfigurationChange } from '@/lib/config-utils';
import { HTTP_STATUS, API_MESSAGES } from '@/lib/constants';
import { resolveTenantOrganizationId } from '@/lib/tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/user/preferences
 * Get current user's preferences
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: API_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const orgId = session.user.organizationId ?? null;
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

    const preferences = await getUserPreferences(session.user.id);

    if (!preferences) {
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: API_MESSAGES.FETCH_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * PUT /api/user/preferences
 * Update current user's preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: API_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const orgId = session.user.organizationId ?? null;
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

    const body = await request.json();
    const validated = userPreferencesSchema.parse(body);

    // Get old preferences for logging
    const oldPreferences = await getUserPreferences(session.user.id);

    const preferences = await updateUserPreferences(session.user.id, validated);

    // Log the change
    if (oldPreferences) {
      await logConfigurationChange('UserPreference', preferences.id, 'UPDATED', {
        entityKey: session.user.id,
        oldValue: oldPreferences,
        newValue: preferences,
        changedBy: session.user.id,
        changedByRole: session.user.role,
        organizationId: session.user.organizationId ?? null,
      });
    }

    return NextResponse.json({
      message: API_MESSAGES.UPDATED_SUCCESS,
      preferences,
    });
  } catch (error: any) {
    console.error('Error updating preferences:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    return NextResponse.json(
      { error: API_MESSAGES.UPDATE_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
