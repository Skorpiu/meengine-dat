'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LessonForm } from '@/components/lessons/LessonForm';
import toast from 'react-hot-toast';

interface BookExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  instructorUserId: string;
}

export function BookExamDialog({ open, onOpenChange, onSuccess, instructorUserId }: BookExamDialogProps) {
  const handleSubmit = async (payload: any) => {
    try {
      const res = await fetch('/api/admin/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Failed to create exam');
      }

      toast.success('Exam created successfully');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create exam');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Book Exam</DialogTitle>
          <DialogDescription>Schedule a practical or theoretical exam.</DialogDescription>
        </DialogHeader>

        <LessonForm
          mode="create"
          userRole="INSTRUCTOR"
          instructorUserId={instructorUserId}
          allowedLessonTypes={['EXAM', 'THEORY_EXAM']}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
