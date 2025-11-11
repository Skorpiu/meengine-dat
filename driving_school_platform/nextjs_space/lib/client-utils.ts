
/**
 * Client-side utility functions for API calls and data handling
 * @module lib/client-utils
 */

import toast from 'react-hot-toast';

/**
 * Generic API call wrapper with error handling
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @returns Response data or throws error
 */
export async function apiCall<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    throw new Error(errorMessage);
  }
}

/**
 * Perform a GET request
 * @param url - API endpoint URL
 * @returns Response data
 */
export async function apiGet<T = any>(url: string): Promise<T> {
  return apiCall<T>(url, { method: 'GET' });
}

/**
 * Perform a POST request
 * @param url - API endpoint URL
 * @param body - Request body
 * @returns Response data
 */
export async function apiPost<T = any>(url: string, body: any): Promise<T> {
  return apiCall<T>(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Perform a PUT request
 * @param url - API endpoint URL
 * @param body - Request body
 * @returns Response data
 */
export async function apiPut<T = any>(url: string, body: any): Promise<T> {
  return apiCall<T>(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * Perform a DELETE request
 * @param url - API endpoint URL
 * @returns Response data
 */
export async function apiDelete<T = any>(url: string): Promise<T> {
  return apiCall<T>(url, { method: 'DELETE' });
}

/**
 * Show success toast notification
 * @param message - Success message
 */
export function showSuccess(message: string): void {
  toast.success(message);
}

/**
 * Show error toast notification
 * @param error - Error message or Error object
 */
export function showError(error: string | Error): void {
  const message = error instanceof Error ? error.message : error;
  toast.error(message);
}

/**
 * Show loading toast notification
 * @param message - Loading message
 * @returns Toast ID for dismissal
 */
export function showLoading(message: string = 'Loading...'): string {
  return toast.loading(message);
}

/**
 * Dismiss a toast by ID
 * @param toastId - Toast ID
 */
export function dismissToast(toastId: string): void {
  toast.dismiss(toastId);
}

/**
 * Handle async operations with loading states
 * @param operation - Async operation to perform
 * @param loadingMessage - Message to show while loading
 * @param successMessage - Message to show on success
 * @returns Operation result
 */
export async function withLoading<T>(
  operation: () => Promise<T>,
  loadingMessage: string = 'Processing...',
  successMessage?: string
): Promise<T> {
  const toastId = showLoading(loadingMessage);
  
  try {
    const result = await operation();
    dismissToast(toastId);
    
    if (successMessage) {
      showSuccess(successMessage);
    }
    
    return result;
  } catch (error) {
    dismissToast(toastId);
    showError(error instanceof Error ? error : 'Operation failed');
    throw error;
  }
}

/**
 * Debounce function
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Format full name from first and last name
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Full name
 */
export function formatFullName(
  firstName?: string | null,
  lastName?: string | null
): string {
  if (!firstName && !lastName) return 'Unknown';
  if (!firstName) return lastName || 'Unknown';
  if (!lastName) return firstName;
  return `${firstName} ${lastName}`;
}

/**
 * Get initials from name
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Initials
 */
export function getInitials(
  firstName?: string | null,
  lastName?: string | null
): string {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return (first + last).toUpperCase() || '?';
}

/**
 * Safely access nested object properties
 * @param obj - Object to access
 * @param path - Property path (e.g., 'user.profile.name')
 * @param defaultValue - Default value if property doesn't exist
 * @returns Property value or default
 */
export function safeGet<T = any>(
  obj: any,
  path: string,
  defaultValue?: T
): T | undefined {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result == null || typeof result !== 'object') {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result !== undefined ? result : defaultValue;
}

/**
 * Validate name (letters, spaces, hyphens, apostrophes only)
 * @param name - Name to validate
 * @returns True if valid
 */
export function isValidName(name: string): boolean {
  return /^[A-Za-zÀ-ÿ\s'-]+$/.test(name);
}

/**
 * Validate email
 * @param email - Email to validate
 * @returns True if valid
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate phone number
 * @param phone - Phone number to validate
 * @returns True if valid
 */
export function isValidPhone(phone: string): boolean {
  return /^\d{9,15}$/.test(phone);
}

/**
 * Format phone number with country code
 * @param countryCode - Country code
 * @param phoneNumber - Phone number
 * @returns Formatted phone number
 */
export function formatPhoneNumber(
  countryCode: string,
  phoneNumber: string
): string {
  return `${countryCode}${phoneNumber}`;
}

/**
 * Parse phone number to extract country code
 * @param fullPhoneNumber - Full phone number with country code
 * @param availableCodes - List of available country codes
 * @returns Object with country code and phone number
 */
export function parsePhoneNumber(
  fullPhoneNumber: string,
  availableCodes: string[] = ['+351', '+1', '+44', '+34', '+33', '+49']
): { countryCode: string; phoneNumber: string } {
  const foundCode = availableCodes.find(code => fullPhoneNumber.startsWith(code));
  
  if (foundCode) {
    return {
      countryCode: foundCode,
      phoneNumber: fullPhoneNumber.slice(foundCode.length),
    };
  }
  
  return {
    countryCode: '+351',
    phoneNumber: fullPhoneNumber,
  };
}
