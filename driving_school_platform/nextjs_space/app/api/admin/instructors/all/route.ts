
/**
 * API endpoint to fetch all instructors for filtering purposes
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET handler - Fetch all instructors
 * Accessible by SUPER_ADMIN roles only
 */
export async function GET(request: NextRequest) {
  // Verify authentication - SUPER_ADMIN only
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Unauthorized - SUPER_ADMIN access required' },
      { status: 401 }
    );
  }

  try {
    // Query User table where role === 'INSTRUCTOR'
    const instructorUsers = await prisma.user.findMany({
      where: {
        role: 'INSTRUCTOR',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    });

    // Format response as required: { instructors: [{ id, userId, name }] }
    const instructors = instructorUsers.map(user => ({
      id: user.id,
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`.trim() || user.email || 'Instructor',
    }));

    return NextResponse.json(
      { instructors },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching instructors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch instructors' },
      { status: 500 }
    );
  }
}
