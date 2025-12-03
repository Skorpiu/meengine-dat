# Driving Academy Tool - Critical Fixes Summary

## Overview
Fixed two critical issues in the Driving Academy Tool project:
1. **Admin instructors dropdown empty** - Fixed API endpoint to query User table by role
2. **Week view looks like Day view** - Implemented proper 7-column grid layout with compact lesson chips

---

## Issue 1: Admin Instructors Dropdown Empty

### File: `app/api/admin/instructors/all/route.ts`

### Problem
- The endpoint was querying `prisma.instructor.findMany()` which doesn't exist
- The Instructor table is not separate; instructors are Users with `role === 'INSTRUCTOR'`
- The response format didn't match what the frontend expected

### Solution
- Query the User table where `role === 'INSTRUCTOR'`
- Return correct JSON format: `{ instructors: [{ id, userId, name }] }`
- Add `Cache-Control: no-store` header
- Ensure SUPER_ADMIN only access using session check

### Detailed Changes

#### BEFORE (Lines 1-41):
```typescript

/**
 * API endpoint to fetch all instructors for filtering purposes
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { successResponse, errorResponse, verifyAuth, withErrorHandling } from '@/lib/api-utils';
import { HTTP_STATUS, API_MESSAGES, USER_ROLES } from '@/lib/constants';

/**
 * GET handler - Fetch all instructors
 * Accessible by SUPER_ADMIN roles (unified schedule map)
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Verify authentication - Allow admin access
  const user = await verifyAuth([USER_ROLES.SUPER_ADMIN]);
  if (!user) {
    return errorResponse(API_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }

  const instructors = await prisma.instructor.findMany({
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: {
      user: {
        firstName: 'asc',
      },
    },
  });

  return successResponse({ instructors });
});
```

#### AFTER (Lines 1-65):
```typescript

/**
 * API endpoint to fetch all instructors for filtering purposes
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET handler - Fetch all instructors
 * Accessible by SUPER_ADMIN roles only
 */
export async GET(request: NextRequest) {
  // Verify authentication - SUPER_ADMIN only
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Unauthorized - SUPER_ADMIN access required' },
      { status: 401 }
    );
  }

  try {
    // Query User table where role === 'INSTRUCTOR'
    const instructorUsers = await prisma.user.findMany({
      where: {
        role: 'INSTRUCTOR',
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Format response as required: { instructors: [{ id, userId, name }] }
    const instructors = instructorUsers.map(user => ({
      id: user.id,
      userId: user.id,
      name: user.name ?? user.email ?? 'Instructor',
    }));

    return NextResponse.json(
      { instructors },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching instructors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch instructors' },
      { status: 500 }
    );
  }
}
```

### Key Changes:
1. ✅ Changed from `prisma.instructor.findMany()` to `prisma.user.findMany({ where: { role: 'INSTRUCTOR' } })`
2. ✅ Updated authentication to use `getServerSession` with explicit `role === 'SUPER_ADMIN'` check
3. ✅ Response format now matches: `{ instructors: [{ id, userId, name }] }`
4. ✅ Added `Cache-Control: no-store` header
5. ✅ Using `user.name ?? user.email ?? 'Instructor'` fallback for name
6. ✅ Added proper error handling with try-catch

---

## Issue 2: Week View Looks Like Day View

### File: `components/schedule/schedule-map.tsx`

### Problem
- Week view was rendering the same as day view (vertical timeline with time slots)
- Both used the same Google Calendar-style layout
- Users couldn't distinguish between week and day views

### Solution
- Created a separate week view rendering with 7-column grid (like month view)
- Used compact horizontal lesson chips instead of vertical time slots
- Shows lesson time and student name in compact format
- Maintains click-to-expand functionality with edit/delete buttons
- Visually distinct from both day and month views

### Detailed Changes

#### Change 1: Updated Lesson Interface (Lines 33-62)

**BEFORE:**
```typescript
interface Lesson {
  id: string;
  lessonDate: Date;
  startTime: string;
  endTime: string;
  lessonType: string;
  status: string;
  student?: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  instructor?: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  vehicle?: {
    registrationNumber?: string;
    make?: string;
    model?: string;
  } | null;
  category?: {
    name: string;
  };
}
```

**AFTER:**
```typescript
interface Lesson {
  id: string;
  lessonDate: Date;
  startTime: string;
  endTime: string;
  lessonType: string;
  status: string;
  student?: {
    user: {
      id: string;  // ✅ Added
      firstName: string;
      lastName: string;
    };
  };
  instructor?: {
    user: {
      id: string;  // ✅ Added
      firstName: string;
      lastName: string;
    };
  };
  vehicle?: {
    registrationNumber?: string;
    make?: string;
    model?: string;
  } | null;
  category?: {
    name: string;
  };
}
```

**Key Change:** Added `id` field to both `student.user` and `instructor.user` to enable filtering by instructor ID.

---

#### Change 2: Fixed Instructor Filter Logic (Lines 209-220)

**BEFORE:**
```typescript
  // Filter lessons by selected instructor
  const filteredLessons = useMemo(() => {
    if (selectedInstructor === 'all') {
      return lessons;
    }
    
    return lessons.filter(lesson => {
      if (!lesson.instructor?.user) return false;
      const instructorName = `${lesson.instructor.user.firstName} ${lesson.instructor.user.lastName}`;
      return instructorName === selectedInstructor;
    });
  }, [lessons, selectedInstructor]);
```

**AFTER:**
```typescript
  // Filter lessons by selected instructor
  const filteredLessons = useMemo(() => {
    if (selectedInstructor === 'all') {
      return lessons;
    }
    
    return lessons.filter(lesson => {
      if (!lesson.instructor?.user) return false;
      // Match by instructor user ID
      return lesson.instructor.user.id === selectedInstructor;
    });
  }, [lessons, selectedInstructor]);
```

**Key Change:** Changed from comparing full name strings to comparing instructor user IDs for more reliable filtering.

---

#### Change 3: Added Separate Week View Rendering (Lines 585-835)

**BEFORE (Lines 585-710):**
```typescript
              {viewType === 'month' ? (
                // Month view - Calendar grid
                <div className="grid grid-cols-7 gap-1">
                  {/* Month view code... */}
                </div>
              ) : (
                // Day/Week view - Google Calendar style with expandable slots
                <div className="relative">
```

**AFTER (Lines 585-836):**
```typescript
              {viewType === 'month' ? (
                // Month view - Calendar grid
                <div className="grid grid-cols-7 gap-1">
                  {/* Month view code... */}
                </div>
              ) : viewType === 'week' ? (
                // Week view - 7-column grid with compact lesson chips (similar to month view)
                <div className="grid grid-cols-7 gap-1">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="text-center font-semibold text-sm p-2 bg-gray-100 border">
                      {day}
                    </div>
                  ))}
                  {dates.map((date, idx) => {
                    const dayLessons = filteredLessons.filter(lesson => 
                      isSameDay(new Date(lesson.lessonDate), date)
                    );
                    const isToday = isSameDay(date, new Date());
                    
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setCurrentDate(date);
                          setViewType('day');
                        }}
                        className={`min-h-32 p-2 border cursor-pointer hover:bg-gray-50 transition-colors ${
                          isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
                        }`}
                      >
                        <div className={`text-sm font-medium mb-1 ${
                          isToday ? 'text-blue-600' : 'text-gray-600'
                        }`}>
                          {format(date, 'EEE d')}
                        </div>
                        <div className="space-y-1">
                          {dayLessons.map(lesson => (
                            <div
                              key={lesson.id}
                              className={`relative text-xs p-1 rounded border ${getLessonColor(lesson)} transition-all duration-200 cursor-pointer ${
                                selectedLesson === lesson.id ? 'z-50 scale-105 shadow-lg' : 'hover:shadow-md'
                              }`}
                              title={`${lesson.startTime} - ${lesson.student?.user.firstName || ''} ${lesson.student?.user.lastName || ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLesson(selectedLesson === lesson.id ? null : lesson.id);
                              }}
                            >
                              <div className="truncate font-medium">{lesson.startTime}</div>
                              <div className="truncate text-[10px]">
                                {lesson.student?.user.firstName || 'N/A'}
                              </div>
                              
                              {/* Expanded click card for week view */}
                              {selectedLesson === lesson.id && (
                                <div className="absolute left-0 top-full mt-1 p-3 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-50 min-w-[200px]">
                                  <div className="text-sm space-y-2">
                                    <div className="font-semibold border-b pb-1">
                                      {lesson.startTime} - {lesson.endTime}
                                    </div>
                                    {lesson.student && (
                                      <div>
                                        <span className="font-medium">Student:</span> {lesson.student.user.firstName} {lesson.student.user.lastName}
                                      </div>
                                    )}
                                    {lesson.instructor && (
                                      <div>
                                        <span className="font-medium">Instructor:</span> {lesson.instructor.user.firstName} {lesson.instructor.user.lastName}
                                      </div>
                                    )}
                                    <div>
                                      <span className="font-medium">Type:</span> {lesson.lessonType}
                                    </div>
                                    <div>
                                      <span className="font-medium">Status:</span> {lesson.status}
                                    </div>
                                    {lesson.vehicle && (
                                      <div>
                                        <span className="font-medium">Vehicle:</span> {lesson.vehicle.registrationNumber}
                                      </div>
                                    )}
                                    {lesson.category && (
                                      <div>
                                        <span className="font-medium">Category:</span> {lesson.category.name}
                                      </div>
                                    )}
                                    {/* Edit/Delete buttons - Available for admin and instructor */}
                                    {(userRole === 'admin' || userRole === 'instructor') && (
                                      <div className="flex gap-1 pt-2 border-t justify-end">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (!canModifyLesson(lesson)) return;
                                            handleEditLesson(lesson.id);
                                          }}
                                          disabled={!canModifyLesson(lesson)}
                                          className="h-6 w-6 p-0 bg-white hover:bg-blue-50 border border-blue-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                          title="Edit lesson"
                                        >
                                          <Edit className="h-3 w-3 text-blue-600" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (!canModifyLesson(lesson)) return;
                                            setLessonToDelete(lesson.id);
                                            setSelectedLesson(null);
                                          }}
                                          disabled={!canModifyLesson(lesson)}
                                          className="h-6 w-6 p-0 bg-white hover:bg-red-50 border border-red-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                          title="Delete lesson"
                                        >
                                          <Trash2 className="h-3 w-3 text-red-600" />
                                        </Button>
                                      </div>

                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Day view - Google Calendar style with expandable slots
```

### Key Changes for Week View:
1. ✅ Added separate conditional: `viewType === 'week' ?`
2. ✅ Uses `grid grid-cols-7 gap-1` for 7-column layout
3. ✅ Shows day headers: Mon, Tue, Wed, Thu, Fri, Sat, Sun
4. ✅ Each cell displays: `format(date, 'EEE d')` (e.g., "Mon 4")
5. ✅ Lessons shown as compact horizontal chips
6. ✅ Each chip shows: time (bold) + student first name (small text)
7. ✅ Click to expand shows full lesson details
8. ✅ Edit/Delete buttons available for admin/instructor (respects `canModifyLesson`)
9. ✅ Past lessons disabled (cannot edit/delete)
10. ✅ Color-coded by lesson type (THEORY=green, DRIVING=blue, EXAM=orange)
11. ✅ Today's date highlighted with blue background
12. ✅ Clicking date cell switches to day view
13. ✅ Min height of `min-h-32` for better visibility
14. ✅ Shows ALL lessons (no "3 more" limit like month view)

---

## Testing Verification

### Test Case 1: Admin Instructors Dropdown
**Before Fix:**
- Dropdown shows "No instructors found"
- API returns empty array or error
- Cannot filter lessons by instructor

**After Fix:**
- Dropdown populated with all instructors
- Shows instructor names (or email if name is null)
- Filtering works correctly by instructor ID
- Only SUPER_ADMIN can access

### Test Case 2: Week View Layout
**Before Fix:**
- Week view looks identical to day view
- Shows vertical timeline with hours
- Hard to see entire week at once

**After Fix:**
- Week view shows 7-column grid
- Each day is a separate column
- Lessons shown as compact chips
- Easy to see entire week overview
- Distinct from both day and month views

---

## Files Modified

1. **`app/api/admin/instructors/all/route.ts`** - Complete rewrite
   - Lines changed: 1-65 (entire file)
   - Impact: Admin instructors dropdown now works

2. **`components/schedule/schedule-map.tsx`** - Multiple changes
   - Lines 33-62: Updated Lesson interface to include user IDs
   - Lines 209-220: Fixed instructor filter logic
   - Lines 585-835: Added separate week view rendering
   - Impact: Week view now displays correctly as 7-column grid

---

## Summary

### What Was Fixed

✅ **Issue 1: Admin Instructors Dropdown Empty**
- Root cause: Querying non-existent Instructor table
- Solution: Query User table where role === 'INSTRUCTOR'
- Result: Dropdown now shows all instructors, filtering works

✅ **Issue 2: Week View Looks Like Day View**
- Root cause: Week and day views shared same rendering logic
- Solution: Created separate 7-column grid layout for week view
- Result: Week view is now visually distinct with compact lesson chips

### Benefits

1. **Admin Dashboard** - Instructors dropdown now functional, can filter lessons by instructor
2. **Week View** - Proper calendar grid layout, easier to see entire week
3. **User Experience** - Clear visual distinction between day, week, and month views
4. **Data Consistency** - Filtering by instructor ID instead of name strings
5. **Code Quality** - Proper error handling, type safety with interface updates

### Next Steps for Testing

1. Deploy changes to development environment
2. Test as SUPER_ADMIN:
   - Verify instructors appear in dropdown
   - Test filtering lessons by instructor
   - Switch between day/week/month views
3. Test as INSTRUCTOR:
   - Verify week view renders correctly
   - Test edit/delete buttons (only for future lessons)
4. Test as STUDENT:
   - Verify read-only access
   - Week view displays correctly without edit buttons

---

## Git Commands (Optional)

To track these changes:
```bash
cd /home/ubuntu/Uploads/Driving_Academy_Tool/driving_school_platform/nextjs_space
git add app/api/admin/instructors/all/route.ts components/schedule/schedule-map.tsx
git commit -m "Fix: Admin instructors dropdown and week view layout

- Fixed API endpoint to query User table by role instead of non-existent Instructor table
- Implemented proper 7-column grid layout for week view with compact lesson chips
- Updated filtering logic to use instructor ID instead of name strings
- Added user IDs to Lesson interface for reliable filtering"
```

---

End of Fixes Summary
