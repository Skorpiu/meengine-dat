
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { vehicleId, underMaintenance } = await request.json();

    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { underMaintenance },
    });

    return NextResponse.json({
      message: `Vehicle ${underMaintenance ? 'marked for' : 'removed from'} maintenance`,
    });
  } catch (error) {
    console.error('Error updating vehicle maintenance status:', error);
    return NextResponse.json(
      { error: 'Failed to update maintenance status' },
      { status: 500 }
    );
  }
}
