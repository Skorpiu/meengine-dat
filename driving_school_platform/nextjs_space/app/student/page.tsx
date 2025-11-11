
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { Navbar } from "@/components/navigation/navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScheduleMap } from "@/components/schedule/schedule-map"
import { 
  Calendar, 
  Clock,
  TrendingUp,
  Award,
  CheckCircle
} from "lucide-react"
import { CategoryProgressSelector } from "@/components/student/category-progress-selector"

export const dynamic = "force-dynamic"

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "STUDENT") {
    redirect("/auth/login")
  }

  // Get student profile
  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    include: {
      user: true,
      category: true,
      transmissionType: true,
      preferredInstructor: { include: { user: true } },
      lessonCounters: { include: { category: true } },
    },
  })

  if (!student) {
    redirect("/auth/login")
  }

  // Fetch dashboard statistics
  const stats = await Promise.all([
    prisma.lesson.count({ 
      where: { 
        studentId: student.id, 
        status: "SCHEDULED" 
      } 
    }),
    prisma.lesson.count({ 
      where: { 
        studentId: student.id, 
        status: "COMPLETED" 
      } 
    }),
    prisma.lessonRequest.count({ 
      where: { 
        studentId: student.id, 
        status: "PENDING" 
      } 
    }),
  ])

  const [
    scheduledLessons,
    completedLessons,
    pendingRequests,
  ] = stats

  // Get lessons for schedule map (next 30 days)
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
  
  const scheduledLessonsForMapRaw = await prisma.lesson.findMany({
    where: {
      studentId: student.id,
      lessonDate: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
        lte: thirtyDaysFromNow,
      },
    },
    include: {
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

  // Progress calculation
  const lessonCounter = student.lessonCounters?.[0]
  const progressPercentage = lessonCounter?.progressPercentage?.toNumber() || 0

  // Serialize lessonCounters to avoid Decimal serialization issues
  const serializedLessonCounters = student.lessonCounters.map(lc => ({
    id: lc.id,
    category: {
      id: lc.category.id,
      name: lc.category.name,
    },
    progressPercentage: lc.progressPercentage?.toNumber() || 0,
    totalDrivingHours: lc.totalDrivingHours?.toNumber() || 0,
    requiredDrivingHours: lc.requiredDrivingHours?.toNumber() || 0,
    totalTheoryLessons: lc.totalTheoryLessons || 0,
    completedTheoryLessons: lc.completedTheoryLessons || 0,
    totalDrivingLessons: lc.totalDrivingLessons || 0,
    completedDrivingLessons: lc.completedDrivingLessons || 0,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage="student" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {session.user.firstName}! Track your learning progress and manage your lessons.
          </p>
        </div>

        {/* Quick Actions - Students cannot book lessons */}
        <div className="mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <div className="bg-blue-100 rounded-full p-3">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-blue-900 mb-2">Lesson Booking</h3>
                <p className="text-blue-700 text-sm mb-3">
                  Your instructor or school administrator will schedule lessons for you. 
                  You'll see all upcoming lessons in your dashboard below.
                </p>
                <p className="text-blue-600 text-sm">
                  Need to request a change? Contact your instructor or administrator.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="hover-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled Lessons</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{scheduledLessons}</div>
              <p className="text-xs text-muted-foreground">Upcoming lessons</p>
            </CardContent>
          </Card>

          <Card className="hover-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Lessons</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedLessons}</div>
              <p className="text-xs text-muted-foreground">Total completed</p>
            </CardContent>
          </Card>

          <Card className="hover-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Course Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{Math.round(progressPercentage)}%</div>
              <p className="text-xs text-muted-foreground">Overall completion</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Schedule Map */}
          <div className="lg:col-span-2">
            <ScheduleMap 
              lessons={scheduledLessonsForMap} 
              showPrintButton={false}
              userRole="student"
            />
          </div>

          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="w-5 h-5" />
                <span>Progress Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryProgressSelector
                lessonCounters={serializedLessonCounters}
                currentCategoryName={student.category?.name || null}
                transmissionTypeName={student.transmissionType?.name || null}
                theoryExamPassed={student.theoryExamPassed}
                practicalExamPassed={student.practicalExamPassed}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
