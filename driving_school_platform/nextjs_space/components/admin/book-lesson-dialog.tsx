

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
      const response = await fetch('/api/admin/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonType: payload.lessonType,
          instructorId: payload.instructorId,
          studentId: payload.studentId || null,
          vehicleId: payload.vehicleId ? parseInt(payload.vehicleId) : null,
          lessonDate: payload.lessonDate,
          startTime: payload.startTime,
          endTime: payload.endTime,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Lesson booked successfully!');
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Book Lesson</DialogTitle>
          <DialogDescription>
            Schedule a new lesson for a student or instructor.
          </DialogDescription>
        </DialogHeader>

        <LessonForm
          mode="create"
          userRole="admin"
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
