import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/navigation/navbar"
import { LessonsManagementClient } from "@/components/admin/lessons-management-client"

export const dynamic = "force-dynamic"

export default async function AdminLessonsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage="lessons" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LessonsManagementClient />
      </div>
    </div>
  )
}
