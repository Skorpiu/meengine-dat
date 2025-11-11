
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScheduleMap } from '@/components/schedule/schedule-map';
import { BookLessonDialog } from './book-lesson-dialog';
import { BookExamDialog } from './book-exam-dialog';
import { useRouter } from 'next/navigation';

interface AdminDashboardClientProps {
  lessons: any[];
}

export function AdminDashboardClient({ lessons: initialLessons }: AdminDashboardClientProps) {
  const router = useRouter();
  const [bookLessonOpen, setBookLessonOpen] = useState(false);
  const [bookExamOpen, setBookExamOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    // Close the dialogs
    setBookLessonOpen(false);
    setBookExamOpen(false);
    
    // Trigger a hard refresh to reload all data
    setTimeout(() => {
      router.refresh();
      // Force a full page reload to ensure all data is updated
      window.location.reload();
    }, 100);
  };

  return (
    <>
      <div className="relative">
        <div className="mb-4 flex justify-end gap-2">
          <Button 
            className="bg-driving-primary hover:bg-driving-primary/90"
            onClick={() => setBookLessonOpen(true)}
          >
            + Book Lesson
          </Button>
          <Button 
            variant="outline"
            onClick={() => setBookExamOpen(true)}
          >
            + Book Exam
          </Button>
        </div>
        <ScheduleMap 
          lessons={initialLessons} 
          showPrintButton={true}
          userRole="admin"
          onLessonsUpdate={handleSuccess}
        />
      </div>

      <BookLessonDialog 
        open={bookLessonOpen}
        onOpenChange={setBookLessonOpen}
        onSuccess={handleSuccess}
      />

      <BookExamDialog 
        open={bookExamOpen}
        onOpenChange={setBookExamOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}
