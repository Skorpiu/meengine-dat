
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { Navbar } from "@/components/navigation/navbar"
import { UsersManagementClient } from "@/components/admin/users-management-client"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/auth/login")
  }

  // Fetch all users
  const usersRaw = await prisma.user.findMany({
    where: {
      role: {
        in: ["STUDENT", "INSTRUCTOR"]
      }
    },
    include: {
      student: {
        include: {
          category: true,
          transmissionType: true,
        }
      },
      instructor: true,
    },
    orderBy: { createdAt: "desc" },
  })

  // Serialize users with Decimal fields converted to numbers
  const users = usersRaw.map(user => ({
    ...user,
    instructor: user.instructor ? {
      ...user.instructor,
      hourlyRate: user.instructor.hourlyRate ? Number(user.instructor.hourlyRate) : null,
      averageRating: user.instructor.averageRating ? Number(user.instructor.averageRating) : null,
      passRatePercentage: user.instructor.passRatePercentage ? Number(user.instructor.passRatePercentage) : null,
    } : null,
  }))

  // Fetch categories and transmission types for the creation form
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })

  const transmissionTypes = await prisma.transmissionType.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })

  const stats = {
    totalStudents: users.filter(u => u.role === "STUDENT").length,
    totalInstructors: users.filter(u => u.role === "INSTRUCTOR").length,
    totalUsers: users.length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage="users" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UsersManagementClient 
          users={users}
          stats={stats}
          categories={categories}
          transmissionTypes={transmissionTypes}
        />
      </div>
    </div>
  )
}
