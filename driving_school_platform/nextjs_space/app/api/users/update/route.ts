
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { resolveTenantOrganizationId } from '@/lib/tenant';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const orgId = session.user.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const tenant = await resolveTenantOrganizationId(request);
    if (tenant.organizationId && tenant.organizationId !== orgId) {
      return NextResponse.json(
        { error: 'Organization does not match this domain' },
        { status: 403 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      userId,
      firstName,
      lastName,
      phoneNumber,
      address,
      role,
      selectedCategories,
      transmissionType,
      instructorLicenseNumber,
      instructorLicenseExpiry,
    } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Ensure target user belongs to this organization
    const target = await prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
      select: { id: true },
    });

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user (scoped)
    const updated = await prisma.user.updateMany({
      where: { id: userId, organizationId: orgId },
      data: {
        firstName,
        lastName,
        phoneNumber: phoneNumber || null,
        address: address || null,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update role-specific data (scoped)
    if (role === 'STUDENT' && selectedCategories?.[0]) {
      const category = await prisma.category.findFirst({
        where: { name: selectedCategories[0] },
      });

      const transmission = transmissionType
        ? await prisma.transmissionType.findFirst({ where: { name: transmissionType } })
        : null;

      await prisma.student.updateMany({
        where: { userId, organizationId: orgId },
        data: {
          categoryId: category?.id,
          transmissionTypeId: transmission?.id,
        },
      });
    } else if (role === 'INSTRUCTOR') {
      const data: any = {};
      if (instructorLicenseNumber) data.instructorLicenseNumber = instructorLicenseNumber;
      if (instructorLicenseExpiry) data.instructorLicenseExpiry = new Date(instructorLicenseExpiry);

      if (Object.keys(data).length > 0) {
        await prisma.instructor.updateMany({
          where: { userId, organizationId: orgId },
          data,
        });
      }
    }

    return NextResponse.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
