'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LessonForm } from '@/components/lessons/LessonForm';
import { Lesson } from '@/lib/types';
import toast from 'react-hot-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface EditLessonClientProps {
  lessonId: string;
  userRole: 'SUPER_ADMIN' | 'INSTRUCTOR';
  userId: string;
}

export function EditLessonClient({ lessonId, userRole, userId }: EditLessonClientProps) {
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compute back href based on user role
  const backHref = userRole === 'SUPER_ADMIN' ? '/admin' : '/instructor';

  useEffect(() => {
    fetchLesson();
  }, [lessonId]);

  const fetchLesson = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/lessons/${lessonId}`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (response.status === 401 || response.status === 403) {
        toast.error('Unauthorized access');
        router.push(backHref);
        return;
      }

      if (response.status === 404) {
        setError('Lesson not found');
        toast.error('Lesson not found');
        setTimeout(() => {
          router.push(backHref);
        }, 2000);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch lesson');
      }

      const result = await response.json();
      
      // Handle both response formats: { data: lesson } or lesson directly
      const lessonData = result.data || result;
      
      // Verify instructor ownership if user is an instructor
      if (userRole === 'INSTRUCTOR' && lessonData?.instructor?.user?.id !== userId) {
        toast.error('You can only edit your own lessons');
        router.push(backHref);
        return;
      }

      setLesson(lessonData);
    } catch (err) {
      console.error('Error fetching lesson:', err);
      setError('Failed to load lesson');
      toast.error('Failed to load lesson');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (payload: any) => {
    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          lessonDate: payload.lessonDate,
          startTime: payload.startTime,
          endTime: payload.endTime,
          status: payload.status,
          vehicleId: payload.vehicleId ? parseInt(payload.vehicleId) : null,
        }),
      });

      if (response.status === 401 || response.status === 403) {
        toast.error('Unauthorized access');
        router.push(backHref);
        return;
      }

      const data = await response.json();

      if (response.ok) {
        toast.success('Lesson updated successfully!');
        router.push(backHref);
      } else {
        toast.error(data.error || 'Failed to update lesson');
      }
    } catch (error) {
      console.error('Error updating lesson:', error);
      toast.error('An error occurred while updating the lesson');
    }
  };

  const handleCancel = () => {
    router.push(backHref);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>
              {error || 'Lesson not found'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push(backHref)} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Schedule
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={backHref}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Schedule
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Lesson</CardTitle>
          <CardDescription>
            Update the lesson details below. Changes will be saved when you submit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LessonForm
            mode="edit"
            initialLesson={lesson}
            userRole={userRole === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'INSTRUCTOR'}
            instructorUserId={lesson.instructorId}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitButtonText="Update Lesson"
          />
        </CardContent>
      </Card>
    </div>
  );
}
