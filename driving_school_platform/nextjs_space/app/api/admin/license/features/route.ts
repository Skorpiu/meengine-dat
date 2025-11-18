
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LicenseService } from '@/lib/services/license-service';
import { db } from '@/lib/db';
import { FEATURE_DEFINITIONS } from '@/lib/config/license-features';

/**
 * GET /api/admin/license/features
 * Get all features for the admin's organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with organization
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Get enabled features
    const enabledFeatures = await LicenseService.getEnabledFeatures(user.organizationId);

    // Build response with all features and their status
    const features = Object.values(FEATURE_DEFINITIONS).map((feature: any) => ({
      ...feature,
      isEnabled: enabledFeatures.includes(feature.key),
    }));

    return NextResponse.json({
      organizationId: user.organizationId,
      organizationName: user.organization?.name,
      subscriptionTier: user.organization?.subscriptionTier,
      features,
    });
  } catch (error) {
    console.error('Error fetching features:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/license/features
 * Toggle a feature on or off
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with organization
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const body = await request.json();
    const { featureKey, enabled } = body;

    if (!featureKey || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Verify feature exists
    if (!FEATURE_DEFINITIONS[featureKey as keyof typeof FEATURE_DEFINITIONS]) {
      return NextResponse.json({ error: 'Invalid feature key' }, { status: 400 });
    }

    // Toggle the feature
    const success = enabled
      ? await LicenseService.enableFeature(user.organizationId, featureKey, session.user.id)
      : await LicenseService.disableFeature(user.organizationId, featureKey);

    if (!success) {
      return NextResponse.json({ error: 'Failed to update feature' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Feature ${enabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    console.error('Error updating feature:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
