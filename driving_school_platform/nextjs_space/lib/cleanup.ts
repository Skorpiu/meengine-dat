/**
 * Cleanup utilities for the application
 * Handles automatic deletion of old records
 */

import { prisma } from '@/lib/db';

/**
 * Delete lessons/exams that are more than 30 days old
 * This should be called periodically (e.g., daily cron job)
 */
export async function cleanupOldLessons() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Delete lessons older than 30 days
    const result = await prisma.lesson.deleteMany({
      where: {
        lessonDate: {
          lt: thirtyDaysAgo,
        },
      },
    });

    console.log(`Cleaned up ${result.count} old lessons/exams from ${thirtyDaysAgo.toISOString()}`);
    return result;
  } catch (error) {
    console.error('Error cleaning up old lessons:', error);
    throw error;
  }
}

/**
 * Get the date threshold for cleanup (30 days ago)
 */
export function getCleanupThreshold(): Date {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return thirtyDaysAgo;
}
