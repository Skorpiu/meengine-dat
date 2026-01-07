
/**
 * Logging Utility
 * Provides structured logging for the application
 * @module lib/logger
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

/**
 * Logger configuration
 */
const config = {
  minLevel: (process.env.NODE_ENV === 'production' ? 'info' : 'debug') as LogLevel,
  enableConsole: !(process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'),
  enableFile: false, // Set to true if you want to write logs to file
};

/**
 * Log levels in order of severity
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Format log entry for console output
 * @param entry - Log entry to format
 * @returns Formatted log string
 */
function formatLogEntry(entry: LogEntry): string {
  const { timestamp, level, message, context } = entry;
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Check if log should be output based on level
 * @param level - Log level to check
 * @returns True if log should be output
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

/**
 * Write log entry
 * @param entry - Log entry to write
 */
function writeLog(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;
  
  const formatted = formatLogEntry(entry);
  
  if (config.enableConsole) {
    switch (entry.level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted, entry.error);
        break;
    }
  }
  
  // In production, you might want to send logs to an external service
  // like Sentry, LogRocket, or CloudWatch
}

/**
 * Logger class for structured logging
 */
class Logger {
  private context: Record<string, any>;
  
  constructor(context: Record<string, any> = {}) {
    this.context = context;
  }
  
  /**
   * Create a child logger with additional context
   * @param additionalContext - Additional context to add
   * @returns New logger instance
   */
  child(additionalContext: Record<string, any>): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }
  
  /**
   * Log debug message
   * @param message - Log message
   * @param context - Additional context
   */
  debug(message: string, context?: Record<string, any>): void {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context: { ...this.context, ...context },
    });
  }
  
  /**
   * Log info message
   * @param message - Log message
   * @param context - Additional context
   */
  info(message: string, context?: Record<string, any>): void {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context: { ...this.context, ...context },
    });
  }
  
  /**
   * Log warning message
   * @param message - Log message
   * @param context - Additional context
   */
  warn(message: string, context?: Record<string, any>): void {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context: { ...this.context, ...context },
    });
  }
  
  /**
   * Log error message
   * @param message - Log message
   * @param error - Error object
   * @param context - Additional context
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error,
      context: { ...this.context, ...context },
    });
  }
  
  /**
   * Log API request
   * @param method - HTTP method
   * @param path - Request path
   * @param statusCode - Response status code
   * @param duration - Request duration in ms
   */
  apiRequest(method: string, path: string, statusCode: number, duration: number): void {
    this.info(`${method} ${path} ${statusCode}`, { duration });
  }
  
  /**
   * Log database query
   * @param model - Prisma model name
   * @param operation - Operation type (find, create, update, delete)
   * @param duration - Query duration in ms
   */
  dbQuery(model: string, operation: string, duration: number): void {
    this.debug(`DB Query: ${model}.${operation}`, { duration });
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create a logger with specific context
 * @param context - Context object
 * @returns Logger instance
 */
export function createLogger(context: Record<string, any>): Logger {
  return new Logger(context);
}

/**
 * Performance monitoring helper
 * @param operation - Operation name
 * @returns Object with end function to log duration
 */
export function measurePerformance(operation: string) {
  const start = Date.now();
  
  return {
    end: (additionalContext?: Record<string, any>) => {
      const duration = Date.now() - start;
      logger.debug(`Performance: ${operation}`, { duration, ...additionalContext });
      return duration;
    },
  };
}
