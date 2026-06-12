import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Navbar } from "@/components/navigation/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import type { Lesson as ScheduleLesson } from "@/components/schedule/schedule-map";
import { getDrivingSchoolName } from "@/lib/config/features";
import { LESSON_LIST_SELECT } from "@/lib/lessons/lesson-queries";
import { mapLessonStudentForScheduleMap } from "@/lib/students/schedule-lesson-student";
import { Users, Car, Calendar, TrendingUp, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/auth/login");
  }

  const orgId = session.user.organizationId;
  if (!orgId) redirect("/auth/login");

  const drivingSchoolName = getDrivingSchoolName();

  // Fetch dashboard statistics
  const stats = await Promise.all([
    prisma.user.count({ where: { organizationId: orgId, role: "STUDENT" } }),
    prisma.user.count({ where: { organizationId: orgId, role: "INSTRUCTOR" } }),
    prisma.vehicle.count({ where: { organizationId: orgId, isActive: true } }),
    prisma.lesson.count({
      where: { organizationId: orgId, status: "SCHEDULED" },
    }),
    prisma.lesson.count({
      where: {
        organizationId: orgId,
        status: "SCHEDULED",
        lessonDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  const [
    totalStudents,
    totalInstructors,
    totalVehicles,
    scheduledLessons,
    completedLessonsThisMonth,
  ] = stats;

  // Get lessons for schedule map (next 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const scheduledLessonsForMapRaw = await prisma.lesson.findMany({
    where: {
      organizationId: orgId,
      lessonDate: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
        lte: thirtyDaysFromNow,
      },
    },
    select: LESSON_LIST_SELECT,
    orderBy: [{ lessonDate: "asc" }, { startTime: "asc" }],
  });

  // Serialize lessons with Decimal fields
  // Normalize lessons to the ScheduleMap shape
  const scheduledLessonsForMap: ScheduleLesson[] =
    scheduledLessonsForMapRaw.map((lesson) => ({
      id: lesson.id,
      lessonDate: lesson.lessonDate,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      lessonType: lesson.lessonType,
      status: lesson.status,

      student: mapLessonStudentForScheduleMap(lesson.student),

      instructor: lesson.instructor
        ? {
            isAvailableForBooking: lesson.instructor.isAvailableForBooking,
            user: {
              id: lesson.instructor.user.id,
              firstName: lesson.instructor.user.firstName,
              lastName: lesson.instructor.user.lastName,
            },
          }
        : undefined,

      vehicle: lesson.vehicle
        ? {
            registrationNumber: lesson.vehicle.registrationNumber ?? undefined,
            make: lesson.vehicle.make ?? undefined,
            model: lesson.vehicle.model ?? undefined,
          }
        : null,

      category: lesson.category
        ? {
            name: lesson.category.name,
          }
        : undefined,
    }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage="admin" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {drivingSchoolName} - Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {session.user.firstName}! Here&apos;s your driving
            school overview.
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Students
              </CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {totalStudents}
              </div>
              <p className="text-xs text-muted-foreground">
                Active enrollments
              </p>
            </CardContent>
          </Card>

          <Card className="hover-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Instructors</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {totalInstructors}
              </div>
              <p className="text-xs text-muted-foreground">
                Certified instructors
              </p>
            </CardContent>
          </Card>

          <Card className="hover-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Fleet Vehicles
              </CardTitle>
              <Car className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {totalVehicles}
              </div>
              <p className="text-xs text-muted-foreground">
                Available vehicles
              </p>
            </CardContent>
          </Card>

          <Card className="hover-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Scheduled Lessons
              </CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {scheduledLessons}
              </div>
              <p className="text-xs text-muted-foreground">Upcoming lessons</p>
            </CardContent>
          </Card>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="hover-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Monthly Performance</CardTitle>
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Completed Lessons
                  </span>
                  <span className="font-semibold">
                    {completedLessonsThisMonth}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Success Rate</span>
                  <span className="font-semibold text-green-600">92%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Student Satisfaction
                  </span>
                  <span className="font-semibold text-green-600">4.8/5</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">System Status</CardTitle>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">System Health</span>
                  <span className="font-semibold text-green-600">
                    Excellent
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Database</span>
                  <span className="font-semibold text-green-600">Online</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Backup</span>
                  <span className="font-semibold">2 hours ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Schedule Map with Booking Controls */}
        <AdminDashboardClient
          lessons={scheduledLessonsForMap}
          adminUserId={session.user.id}
        />
      </div>
    </div>
  );
}
