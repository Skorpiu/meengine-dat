
/**
 * Date and time utility functions
 * @module lib/date-utils
 */

import { format, parseISO, isValid, addDays, subDays, startOfDay, endOfDay } from 'date-fns';
import { DATE_FORMATS } from './constants';

/**
 * Format a date for display
 * @param date - Date to format
 * @param formatString - Format string (defaults to display format)
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  formatString: string = DATE_FORMATS.DISPLAY
): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      return 'Invalid date';
    }
    return format(dateObj, formatString);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid date';
  }
}

/**
 * Format a time string to HH:mm format
 * @param time - Time string
 * @returns Formatted time
 */
export function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

/**
 * Get current date in ISO format
 * @returns ISO date string
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current time in HH:mm format
 * @returns Time string
 */
export function getCurrentTime(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * Check if a date is in the past
 * @param date - Date to check
 * @returns True if date is in the past
 */
export function isPastDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj < new Date();
}

/**
 * Check if a date is today
 * @param date - Date to check
 * @returns True if date is today
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const today = new Date();
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}

/**
 * Get a date range (yesterday, today, tomorrow)
 * @returns Object with date ranges
 */
export function getDateRange(): {
  yesterday: Date;
  today: Date;
  tomorrow: Date;
} {
  const today = startOfDay(new Date());
  const yesterday = subDays(today, 1);
  const tomorrow = endOfDay(addDays(today, 1));
  
  return { yesterday, today, tomorrow };
}

/**
 * Calculate age from date of birth
 * @param dateOfBirth - Date of birth
 * @returns Age in years
 */
export function calculateAge(dateOfBirth: Date | string): number {
  const dob = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Format duration in minutes to readable format
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}

/**
 * Parse a date string safely
 * @param dateString - Date string to parse
 * @returns Parsed date or null
 */
export function safeParseDateString(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  
  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch (error) {
    console.error('Date parsing error:', error);
    return null;
  }
}
