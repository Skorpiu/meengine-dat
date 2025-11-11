
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { Navbar } from "@/components/navigation/navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InstructorDashboardClient } from "@/components/instructor/instructor-dashboard-client"
import { 
  Calendar, 
  Users, 
  Clock,
  Star,
  TrendingUp
} from "lucide-react"

export const dynamic = "force-dynamic"

export default async function InstructorDashboard() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "INSTRUCTOR") {
    redirect("/auth/login")
  }

  // Get instructor profile
  const instructorRaw = await prisma.instructor.findUnique({
    where: { userId: session.user.id },
    include: {
      user: true,
      qualifiedCategories: true,
      qualifiedTransmissionTypes: true,
    },
  })

  if (!instructorRaw) {
    redirect("/auth/login")
  }

  // Serialize Decimal fields to numbers
  const instructor = {
    ...instructorRaw,
    hourlyRate: instructorRaw.hourlyRate ? Number(instructorRaw.hourlyRate) : 0,
    averageRating: instructorRaw.averageRating ? Number(instructorRaw.averageRating) : 0,
    passRatePercentage: instructorRaw.passRatePercentage ? Number(instructorRaw.passRatePercentage) : 0,
  }

  // Fetch dashboard statistics
  const stats = await Promise.all([
    prisma.lesson.count({ 
      where: { 
        instructorId: instructor.id, 
        status: "SCHEDULED" 
      } 
    }),
    prisma.lesson.count({ 
      where: { 
        instructorId: instructor.id, 
        status: "COMPLETED",
        lessonDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      } 
    }),
    prisma.lessonRequest.count({ 
      where: { 
        instructorId: instructor.id, 
        status: "PENDING" 
      } 
    }),
  ])

  const [
    scheduledLessons,
    completedLessonsThisMonth,
    pendingRequests,
  ] = stats

  // Today's lessons count
  const todaysLessonsCount = await prisma.lesson.count({
    where: {
      instructorId: instructor.id,
      lessonDate: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
        lt: new Date(new Date().setHours(23, 59, 59, 999)),
      },
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
    },
  })

  // Get lessons for schedule map (next 30 days)
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  
  const scheduledLessonsForMapRaw = await prisma.lesson.findMany({
    where: {
      instructorId: instructor.id,
      lessonDate: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
        lte: thirtyDaysFromNow,
      },
    },
    include: {
      student: { include: { user: true } },
      instructor: { include: { user: true } },
      vehicle: true,
      category: true,
    },
    orderBy: [{ lessonDate: "asc" }, { startTime: "asc" }],
  })

  // Serialize lessons with Decimal fields
  const scheduledLessonsForMap = scheduledLessonsForMapRaw.map(lesson => ({
    ...lesson,
    instructor: lesson.instructor ? {
      user: {
        firstName: lesson.instructor.user.firstName,
        lastName: lesson.instructor.user.lastName,
      },
    } : undefined,
  })) as any

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage="instructor" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Instructor Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {session.user.firstName}! Here's your teaching schedule and performance.
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="hover-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Lessons</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{todaysLessonsCount}</div>
              <p className="text-xs text-muted-foreground">Scheduled for today</p>
            </CardContent>
          </Card>

          <Card className="hover-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedLessonsThisMonth}</div>
              <p className="text-xs text-muted-foreground">Lessons completed</p>
            </CardContent>
          </Card>

          <Card className="hover-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pendingRequests}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
        </div>

        {/* Schedule Map and Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <InstructorDashboardClient
              lessons={scheduledLessonsForMap}
              instructorUserId={session.user.id}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="w-5 h-5" />
                <span>Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Average Rating</span>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{instructor.averageRating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Success Rate</span>
                  <span className="font-semibold text-green-600">{instructor.passRatePercentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Lessons</span>
                  <span className="font-semibold">{instructor.totalLessonsCompleted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Experience</span>
                  <span className="font-semibold">
                    {instructor.hireDate ? 
                      Math.floor((Date.now() - new Date(instructor.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365)) : 0
                    } years
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
