
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
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

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        phoneNumber: phoneNumber || null,
        address: address || null,
      },
    });

    // Update role-specific data
    if (role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId },
      });

      if (student && selectedCategories?.[0]) {
        // Get category
        const category = await prisma.category.findFirst({
          where: { name: selectedCategories[0] },
        });

        // Get transmission type
        const transmission = transmissionType ? await prisma.transmissionType.findFirst({
          where: { name: transmissionType },
        }) : null;

        await prisma.student.update({
          where: { id: student.id },
          data: {
            categoryId: category?.id,
            transmissionTypeId: transmission?.id,
          },
        });
      }
    } else if (role === 'INSTRUCTOR') {
      const instructor = await prisma.instructor.findUnique({
        where: { userId },
      });

      if (instructor) {
        await prisma.instructor.update({
          where: { id: instructor.id },
          data: {
            instructorLicenseNumber: instructorLicenseNumber || instructor.instructorLicenseNumber,
            instructorLicenseExpiry: instructorLicenseExpiry ? 
              new Date(instructorLicenseExpiry) : instructor.instructorLicenseExpiry,
          },
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
