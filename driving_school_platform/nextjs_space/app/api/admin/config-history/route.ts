
/**
 * Configuration History API
 * @route /api/admin/config-history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { configHistoryQuerySchema } from '@/lib/config-validation';
import { HTTP_STATUS, API_MESSAGES } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/config-history
 * Fetch configuration change history (admin only)
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
    const query = configHistoryQuerySchema.parse({
      entityType: searchParams.get('entityType') || undefined,
      entityId: searchParams.get('entityId') || undefined,
      action: searchParams.get('action') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    });

    const where: any = {};
    
    if (query.entityType) {
      where.entityType = query.entityType;
    }
    
    if (query.entityId) {
      where.entityId = query.entityId;
    }
    
    if (query.action) {
      where.action = query.action;
    }

    const [history, total] = await Promise.all([
      prisma.configurationHistory.findMany({
        where,
        orderBy: { changedAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.configurationHistory.count({ where }),
    ]);

    return NextResponse.json({
      history,
      total,
      limit: query.limit,
      offset: query.offset,
    });
  } catch (error) {
    console.error('Error fetching config history:', error);
    return NextResponse.json(
      { error: API_MESSAGES.FETCH_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
