
/**
 * System Settings API
 * @route /api/admin/settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { systemSettingSchema, settingsQuerySchema } from '@/lib/config-validation';
import { parseSettingValue, stringifySettingValue, logConfigurationChange } from '@/lib/config-utils';
import { HTTP_STATUS, API_MESSAGES } from '@/lib/constants';

/**
 * GET /api/admin/settings
 * Fetch all system settings (admin only)
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
    const query = settingsQuerySchema.parse({
      category: searchParams.get('category') || undefined,
      isPublic: searchParams.get('isPublic') === 'true',
      search: searchParams.get('search') || undefined,
    });

    const where: any = {};
    
    if (query.category) {
      where.category = query.category;
    }
    
    if (query.isPublic !== undefined) {
      where.isPublic = query.isPublic;
    }
    
    if (query.search) {
      where.OR = [
        { settingKey: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const settings = await prisma.systemSetting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { settingKey: 'asc' }],
    });

    // Parse values based on type
    const parsedSettings = settings.map(setting => ({
      ...setting,
      parsedValue: parseSettingValue(setting.settingValue, setting.settingType),
    }));

    return NextResponse.json({
      settings: parsedSettings,
      total: parsedSettings.length,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: API_MESSAGES.FETCH_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * POST /api/admin/settings
 * Create a new system setting (admin only)
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
    const validated = systemSettingSchema.parse(body);

    // Check if setting already exists
    const existing = await prisma.systemSetting.findUnique({
      where: { settingKey: validated.settingKey },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Setting already exists' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const setting = await prisma.systemSetting.create({
      data: {
        settingKey: validated.settingKey,
        settingValue: validated.settingValue,
        settingType: validated.settingType,
        description: validated.description,
        category: validated.category,
        isPublic: validated.isPublic ?? false,
        updatedBy: session.user.id,
      },
    });

    // Log the change
    await logConfigurationChange('SystemSetting', setting.id, 'CREATED', {
      entityKey: setting.settingKey,
      newValue: { [setting.settingKey]: parseSettingValue(setting.settingValue, setting.settingType) },
      changedBy: session.user.id,
      changedByRole: session.user.role,
    });

    return NextResponse.json({
      message: API_MESSAGES.CREATED_SUCCESS,
      setting: {
        ...setting,
        parsedValue: parseSettingValue(setting.settingValue, setting.settingType),
      },
    }, { status: HTTP_STATUS.CREATED });
  } catch (error: any) {
    console.error('Error creating setting:', error);
    
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
 * PUT /api/admin/settings
 * Update an existing system setting (admin only)
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
    const { settingKey, ...updates } = body;

    if (!settingKey) {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Get old value for logging
    const oldSetting = await prisma.systemSetting.findUnique({
      where: { settingKey },
    });

    if (!oldSetting) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const setting = await prisma.systemSetting.update({
      where: { settingKey },
      data: {
        ...updates,
        updatedBy: session.user.id,
      },
    });

    // Log the change
    await logConfigurationChange('SystemSetting', setting.id, 'UPDATED', {
      entityKey: setting.settingKey,
      oldValue: { [oldSetting.settingKey]: parseSettingValue(oldSetting.settingValue, oldSetting.settingType) },
      newValue: { [setting.settingKey]: parseSettingValue(setting.settingValue, setting.settingType) },
      changedBy: session.user.id,
      changedByRole: session.user.role,
    });

    return NextResponse.json({
      message: API_MESSAGES.UPDATED_SUCCESS,
      setting: {
        ...setting,
        parsedValue: parseSettingValue(setting.settingValue, setting.settingType),
      },
    });
  } catch (error: any) {
    console.error('Error updating setting:', error);
    
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
 * DELETE /api/admin/settings
 * Delete a system setting (admin only)
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
    const settingKey = searchParams.get('key');

    if (!settingKey) {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Get setting before deletion for logging
    const setting = await prisma.systemSetting.findUnique({
      where: { settingKey },
    });

    if (!setting) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    await prisma.systemSetting.delete({
      where: { settingKey },
    });

    // Log the change
    await logConfigurationChange('SystemSetting', setting.id, 'DELETED', {
      entityKey: setting.settingKey,
      oldValue: { [setting.settingKey]: parseSettingValue(setting.settingValue, setting.settingType) },
      changedBy: session.user.id,
      changedByRole: session.user.role,
    });

    return NextResponse.json({
      message: API_MESSAGES.DELETED_SUCCESS,
    });
  } catch (error) {
    console.error('Error deleting setting:', error);
    return NextResponse.json(
      { error: API_MESSAGES.DELETE_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
