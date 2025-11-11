
/**
 * Input Sanitization Utilities
 * Provides functions to sanitize and validate user inputs to prevent XSS and injection attacks
 * @module lib/sanitization
 */

/**
 * Sanitize HTML string by removing potentially dangerous tags and attributes
 * @param input - HTML string to sanitize
 * @returns Sanitized string
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  
  return sanitized.trim();
}

/**
 * Sanitize plain text input by escaping HTML special characters
 * @param input - Text to sanitize
 * @returns Sanitized text
 */
export function sanitizeText(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Sanitize SQL input (use with caution - prefer parameterized queries)
 * @param input - Input to sanitize
 * @returns Sanitized input
 */
export function sanitizeSql(input: string): string {
  if (!input) return '';
  
  // Remove SQL comment markers
  let sanitized = input.replace(/--/g, '');
  sanitized = sanitized.replace(/\/\*/g, '');
  sanitized = sanitized.replace(/\*\//g, '');
  
  // Escape single quotes
  sanitized = sanitized.replace(/'/g, "''");
  
  return sanitized.trim();
}

/**
 * Sanitize file name by removing path traversal attempts and special characters
 * @param fileName - File name to sanitize
 * @returns Sanitized file name
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return '';
  
  // Remove path traversal attempts
  let sanitized = fileName.replace(/\.\./g, '');
  sanitized = sanitized.replace(/[\/\\]/g, '');
  
  // Remove special characters except dots, dashes, and underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  return sanitized.trim();
}

/**
 * Sanitize URL by validating and normalizing
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  try {
    // Remove leading/trailing whitespace
    const trimmed = url.trim();
    
    // Check for javascript: and data: protocols
    if (trimmed.match(/^(javascript|data|vbscript):/i)) {
      return '';
    }
    
    // Validate URL format
    const urlObj = new URL(trimmed);
    
    // Only allow http, https, and mailto protocols
    if (!['http:', 'https:', 'mailto:'].includes(urlObj.protocol)) {
      return '';
    }
    
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return empty string
    return '';
  }
}

/**
 * Sanitize phone number by removing non-numeric characters
 * @param phone - Phone number to sanitize
 * @returns Sanitized phone number
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';
  
  // Keep only digits, plus sign, and spaces
  return phone.replace(/[^0-9+\s]/g, '').trim();
}

/**
 * Sanitize email address
 * @param email - Email to sanitize
 * @returns Sanitized email in lowercase
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';
  
  return email.toLowerCase().trim();
}

/**
 * Sanitize object by recursively sanitizing all string values
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeText(item) : item
      );
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}
