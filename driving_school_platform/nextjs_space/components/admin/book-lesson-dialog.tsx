

'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LessonForm } from '@/components/lessons/LessonForm';
import toast from 'react-hot-toast';

interface BookLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BookLessonDialog({ open, onOpenChange, onSuccess }: BookLessonDialogProps) {
  const handleSubmit = async (payload: any) => {
    try {
      const requestBody: any = {
        lessonType: payload.lessonType,
        instructorId: payload.instructorId,
        lessonDate: payload.lessonDate,
        startTime: payload.startTime,
        endTime: payload.endTime,
      };

      // Add student data based on lesson type
      if (payload.studentIds && payload.studentIds.length > 0) {
        // Multi-student lesson types (EXAM, THEORY_EXAM)
        requestBody.studentIds = payload.studentIds;
      } else if (payload.studentId) {
        // Single student lesson types (DRIVING, THEORY)
        requestBody.studentId = payload.studentId;
      }

      // Add vehicle if selected
      if (payload.vehicleId) {
        requestBody.vehicleId = parseInt(payload.vehicleId);
      }

      const response = await fetch('/api/admin/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Lesson booked successfully!');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to book lesson');
      }
    } catch (error) {
      console.error('Error booking lesson:', error);
      toast.error('An error occurred');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Lesson</DialogTitle>
          <DialogDescription>
            Schedule a new lesson, exam, or theory class for students.
          </DialogDescription>
        </DialogHeader>

        <LessonForm
          mode="create"
          userRole="SUPER_ADMIN"
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
