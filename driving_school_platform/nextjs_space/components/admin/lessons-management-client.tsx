
'use client';

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, Car, FileText, Clock, RefreshCw } from "lucide-react"
import { FeatureGate } from "@/components/license/feature-gate"
import { useToast } from "@/hooks/use-toast"

type LessonView = 'CODE' | 'DRIVING' | 'EXAMS'

export function LessonsManagementClient() {
  const [selectedView, setSelectedView] = useState<LessonView>('DRIVING')
  const [recentLessons, setRecentLessons] = useState<any[]>([])
  const [currentLessons, setCurrentLessons] = useState<any[]>([])
  const [upcomingLessons, setUpcomingLessons] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const { toast } = useToast()

  const fetchLessons = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/lessons?view=${selectedView}&t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch lessons')
      }
      
      const data = await response.json()
      setRecentLessons(data.recent || [])
      setCurrentLessons(data.current || [])
      setUpcomingLessons(data.upcoming || [])
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Error fetching lessons:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch lessons. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchLessons()
    toast({
      title: 'Refreshed',
      description: 'Lesson data has been updated.',
    })
  }

  useEffect(() => {
    fetchLessons()
  }, [selectedView])

  // Poll for new data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLessons()
    }, 30000)

    return () => clearInterval(interval)
  }, [selectedView])

  // Refresh data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchLessons()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Also listen for focus events
    const handleFocus = () => {
      fetchLessons()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const renderLesson = (lesson: any) => {
    const isExam = selectedView === 'EXAMS'
    
    return (
      <div key={lesson.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
        <div className="flex items-center space-x-4">
          <div className="text-center min-w-[80px]">
            <div className="text-sm font-medium">
              {new Date(lesson.lessonDate || lesson.examDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
            <div className="text-xs text-gray-500">
              {lesson.startTime}
            </div>
          </div>
          <div className={`w-3 h-3 rounded-full ${
            selectedView === 'DRIVING' ? 'bg-green-500' :
            selectedView === 'CODE' ? 'bg-blue-500' :
            'bg-orange-500'
          }`} />
          <div>
            {isExam ? (
              <>
                <div className="font-medium">
                  {lesson.examType} Exam - {lesson.category?.name}
                </div>
                <div className="text-sm text-gray-600">
                  Location: {lesson.examLocation}
                </div>
                {lesson.examiner && (
                  <div className="text-sm text-gray-500">
                    Examiner: {lesson.examiner.user?.firstName} {lesson.examiner.user?.lastName}
                  </div>
                )}
                {lesson.vehicle && (
                  <div className="text-sm text-gray-500">
                    Vehicle: {lesson.vehicle.registrationNumber}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="font-medium">
                  {lesson.student?.user?.firstName} {lesson.student?.user?.lastName}
                </div>
                <div className="text-sm text-gray-600">
                  with {lesson.instructor?.user?.firstName} {lesson.instructor?.user?.lastName}
                </div>
                <div className="text-sm text-gray-500">
                  {selectedView === 'DRIVING' && lesson.vehicle && (
                    <>Vehicle: {lesson.vehicle.registrationNumber} • </>
                  )}
                  {lesson.category?.name}
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {selectedView === 'DRIVING' && lesson.vehicle && (
            <div className="text-right text-sm">
              <div className="font-medium">
                {lesson.vehicle.make} {lesson.vehicle.model}
              </div>
            </div>
          )}
          
          <Badge variant={
            lesson.status === "SCHEDULED" ? "default" :
            lesson.status === "COMPLETED" ? "secondary" :
            lesson.status === "IN_PROGRESS" ? "default" :
            lesson.status === "CANCELLED" ? "destructive" :
            "outline"
          }>
            {lesson.status?.toLowerCase() || 'scheduled'}
          </Badge>
        </div>
      </div>
    )
  }

  return (
    <FeatureGate
      featureKey="LESSON_MANAGEMENT"
      fallback={
        <Card className="border-2 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Premium Feature
            </CardTitle>
            <CardDescription>
              Lesson Management is a premium feature. Please contact your administrator to enable this feature.
            </CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Lesson Management</h1>
              <p className="text-gray-600 mt-2">
                Track recent and upcoming lessons across all categories.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <div className="text-xs text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex space-x-2 mb-8">
          <Button
            variant={selectedView === 'CODE' ? 'default' : 'outline'}
            onClick={() => setSelectedView('CODE')}
            className={selectedView === 'CODE' ? 'bg-blue-600' : ''}
          >
            <FileText className="w-4 h-4 mr-2" />
            Code Lessons
          </Button>
          <Button
            variant={selectedView === 'DRIVING' ? 'default' : 'outline'}
            onClick={() => setSelectedView('DRIVING')}
            className={selectedView === 'DRIVING' ? 'bg-green-600' : ''}
          >
            <Car className="w-4 h-4 mr-2" />
            Driving Lessons
          </Button>
          <Button
            variant={selectedView === 'EXAMS' ? 'default' : 'outline'}
            onClick={() => setSelectedView('EXAMS')}
            className={selectedView === 'EXAMS' ? 'bg-orange-600' : ''}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Exams
          </Button>
        </div>

        {/* Lessons Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Lessons/Exams */}
          <Card>
            <CardHeader>
              <CardTitle>{selectedView === 'EXAMS' ? 'Recent Exams' : 'Recent Lessons'}</CardTitle>
              <CardDescription>
                {selectedView === 'EXAMS' ? 'Exams' : 'Lessons'} from yesterday and today that already occurred
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : recentLessons.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent {selectedView === 'EXAMS' ? 'exams' : 'lessons'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentLessons.map(renderLesson)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Lessons/Exams */}
          <Card className="border-2 border-orange-300 bg-orange-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600 animate-pulse" />
                {selectedView === 'EXAMS' ? 'Current Exams' : 'Current Lessons'}
              </CardTitle>
              <CardDescription>
                {selectedView === 'EXAMS' ? 'Exams' : 'Lessons'} happening right now
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : currentLessons.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No {selectedView === 'EXAMS' ? 'exams' : 'lessons'} in progress</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentLessons.map(renderLesson)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Lessons/Exams */}
          <Card>
            <CardHeader>
              <CardTitle>{selectedView === 'EXAMS' ? 'Upcoming Exams' : 'Upcoming Lessons'}</CardTitle>
              <CardDescription>
                {selectedView === 'EXAMS' ? 'Exams' : 'Lessons'} scheduled for today (not yet occurred) and tomorrow
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : upcomingLessons.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming {selectedView === 'EXAMS' ? 'exams' : 'lessons'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingLessons.map(renderLesson)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </>
    </FeatureGate>
  )
}
