
/**
 * Feature Flags API
 * @route /api/admin/feature-flags
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { featureFlagSchema, featureFlagsQuerySchema } from '@/lib/config-validation';
import { logConfigurationChange } from '@/lib/config-utils';
import { HTTP_STATUS, API_MESSAGES } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/feature-flags
 * Fetch all feature flags (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: API_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = featureFlagsQuerySchema.parse({
      environment: searchParams.get('environment') || undefined,
      category: searchParams.get('category') || undefined,
      isEnabled: searchParams.get('isEnabled') === 'true' || undefined,
      search: searchParams.get('search') || undefined,
    });

    const where: any = {};
    
    if (query.environment) {
      where.environment = query.environment;
    }
    
    if (query.category) {
      where.category = query.category;
    }
    
    if (query.isEnabled !== undefined) {
      where.isEnabled = query.isEnabled;
    }
    
    if (query.search) {
      where.OR = [
        { flagKey: { contains: query.search, mode: 'insensitive' } },
        { flagName: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const flags = await prisma.featureFlag.findMany({
      where,
      orderBy: [{ category: 'asc' }, { flagKey: 'asc' }],
    });

    return NextResponse.json({
      flags,
      total: flags.length,
    });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return NextResponse.json(
      { error: API_MESSAGES.FETCH_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * POST /api/admin/feature-flags
 * Create a new feature flag (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: API_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const body = await request.json();
    const validated = featureFlagSchema.parse(body);

    // Check if flag already exists
    const existing = await prisma.featureFlag.findUnique({
      where: { flagKey: validated.flagKey },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Feature flag already exists' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const flag = await prisma.featureFlag.create({
      data: {
        flagKey: validated.flagKey,
        flagName: validated.flagName,
        description: validated.description,
        isEnabled: validated.isEnabled,
        enabledForRoles: validated.enabledForRoles || [],
        enabledForUsers: validated.enabledForUsers || [],
        rolloutPercent: validated.rolloutPercent || 0,
        environment: validated.environment || 'production',
        category: validated.category,
        tags: validated.tags || [],
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      },
    });

    // Log the change
    await logConfigurationChange('FeatureFlag', flag.id, 'CREATED', {
      entityKey: flag.flagKey,
      newValue: flag,
      changedBy: session.user.id,
      changedByRole: session.user.role,
    });

    return NextResponse.json({
      message: API_MESSAGES.CREATED_SUCCESS,
      flag,
    }, { status: HTTP_STATUS.CREATED });
  } catch (error: any) {
    console.error('Error creating feature flag:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    return NextResponse.json(
      { error: API_MESSAGES.CREATE_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * PUT /api/admin/feature-flags
 * Update an existing feature flag (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: API_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const body = await request.json();
    const { flagKey, ...updates } = body;

    if (!flagKey) {
      return NextResponse.json(
        { error: 'Flag key is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Get old value for logging
    const oldFlag = await prisma.featureFlag.findUnique({
      where: { flagKey },
    });

    if (!oldFlag) {
      return NextResponse.json(
        { error: 'Feature flag not found' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const flag = await prisma.featureFlag.update({
      where: { flagKey },
      data: {
        ...updates,
        expiresAt: updates.expiresAt ? new Date(updates.expiresAt) : undefined,
        updatedBy: session.user.id,
      },
    });

    // Log the change
    const action = oldFlag.isEnabled !== flag.isEnabled 
      ? (flag.isEnabled ? 'ENABLED' : 'DISABLED')
      : 'UPDATED';

    await logConfigurationChange('FeatureFlag', flag.id, action, {
      entityKey: flag.flagKey,
      oldValue: oldFlag,
      newValue: flag,
      changedBy: session.user.id,
      changedByRole: session.user.role,
    });

    return NextResponse.json({
      message: API_MESSAGES.UPDATED_SUCCESS,
      flag,
    });
  } catch (error: any) {
    console.error('Error updating feature flag:', error);
    
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

/**
 * DELETE /api/admin/feature-flags
 * Delete a feature flag (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: API_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const { searchParams } = new URL(request.url);
    const flagKey = searchParams.get('key');

    if (!flagKey) {
      return NextResponse.json(
        { error: 'Flag key is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Get flag before deletion for logging
    const flag = await prisma.featureFlag.findUnique({
      where: { flagKey },
    });

    if (!flag) {
      return NextResponse.json(
        { error: 'Feature flag not found' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    await prisma.featureFlag.delete({
      where: { flagKey },
    });

    // Log the change
    await logConfigurationChange('FeatureFlag', flag.id, 'DELETED', {
      entityKey: flag.flagKey,
      oldValue: flag,
      changedBy: session.user.id,
      changedByRole: session.user.role,
    });

    return NextResponse.json({
      message: API_MESSAGES.DELETED_SUCCESS,
    });
  } catch (error) {
    console.error('Error deleting feature flag:', error);
    return NextResponse.json(
      { error: API_MESSAGES.DELETE_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
