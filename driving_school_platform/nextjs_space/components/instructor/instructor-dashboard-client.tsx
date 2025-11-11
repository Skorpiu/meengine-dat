
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScheduleMap } from '@/components/schedule/schedule-map';
import { BookLessonDialog } from '@/components/instructor/book-lesson-dialog-instructor';
import { BookExamDialog } from '@/components/instructor/book-exam-dialog-instructor';
import { useRouter } from 'next/navigation';

interface InstructorDashboardClientProps {
  lessons: any[];
  instructorUserId: string;
}

export function InstructorDashboardClient({ lessons: initialLessons, instructorUserId }: InstructorDashboardClientProps) {
  const router = useRouter();
  const [bookLessonOpen, setBookLessonOpen] = useState(false);
  const [bookExamOpen, setBookExamOpen] = useState(false);

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
          showPrintButton={false}
          userRole="instructor"
          onLessonsUpdate={handleSuccess}
        />
      </div>

      <BookLessonDialog 
        open={bookLessonOpen}
        onOpenChange={setBookLessonOpen}
        onSuccess={handleSuccess}
        instructorUserId={instructorUserId}
      />

      <BookExamDialog 
        open={bookExamOpen}
        onOpenChange={setBookExamOpen}
        onSuccess={handleSuccess}
        instructorUserId={instructorUserId}
      />
    </>
  );
}
