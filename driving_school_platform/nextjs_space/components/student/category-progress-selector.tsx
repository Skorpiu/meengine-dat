'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface LessonCounter {
  id: string;
  category: {
    id: number;
    name: string;
  };
  progressPercentage: number;
  totalDrivingHours: number;
  requiredDrivingHours: number;
  totalTheoryLessons?: number;
  completedTheoryLessons?: number;
  totalDrivingLessons?: number;
  completedDrivingLessons?: number;
}

interface CategoryProgressSelectorProps {
  lessonCounters: LessonCounter[];
  currentCategoryName: string | null;
  transmissionTypeName: string | null;
  theoryExamPassed: boolean;
  practicalExamPassed: boolean;
}

export function CategoryProgressSelector({
  lessonCounters,
  currentCategoryName,
  transmissionTypeName,
  theoryExamPassed,
  practicalExamPassed,
}: CategoryProgressSelectorProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    lessonCounters.length > 0 ? lessonCounters[0].category.id.toString() : 'all'
  );

  const selectedCounter = lessonCounters.find(
    (lc) => lc.category.id.toString() === selectedCategoryId
  );

  const progressPercentage = selectedCounter?.progressPercentage || 0;
  const drivingHours = selectedCounter?.totalDrivingHours || 0;
  const requiredHours = selectedCounter?.requiredDrivingHours || 0;
  const categoryName = selectedCounter?.category.name || currentCategoryName || 'Not selected';

  return (
    <div className="space-y-6">
      {/* Category Selector */}
      {lessonCounters.length > 1 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Category</label>
          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {lessonCounters.map((lc) => (
                <SelectItem key={lc.category.id} value={lc.category.id.toString()}>
                  {lc.category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Progress Display */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm text-gray-600">{Math.round(progressPercentage)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Category</span>
          <span className="font-medium">{categoryName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Transmission</span>
          <span className="font-medium">{transmissionTypeName || 'Not selected'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Code Lessons</span>
          <span className="font-medium">
            {selectedCounter?.completedTheoryLessons || 0} / 30
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Driving Lessons</span>
          <span className="font-medium">
            {selectedCounter?.completedDrivingLessons || 0} / 25
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Theory Exam</span>
          <div className="flex items-center space-x-1">
            {theoryExamPassed ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-green-600 font-medium">Passed</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-yellow-600 font-medium">Pending</span>
              </>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Practical Exam</span>
          <div className="flex items-center space-x-1">
            {practicalExamPassed ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-green-600 font-medium">Passed</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-yellow-600 font-medium">Pending</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
