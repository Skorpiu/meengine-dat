
/**
 * Caching Utilities
 * Provides in-memory caching with TTL support
 * @module lib/cache
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Simple in-memory cache with TTL
 */
class Cache<T = any> {
  private store: Map<string, CacheEntry<T>>;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.store = new Map();
    
    // Clean up expired entries every minute
    if (typeof window === 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
    }
  }
  
  /**
   * Get value from cache
   * @param key - Cache key
   * @returns Cached value or undefined if not found or expired
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    
    if (!entry) return undefined;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    
    return entry.value;
  }
  
  /**
   * Set value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlMs - Time to live in milliseconds (default: 5 minutes)
   */
  set(key: string, value: T, ttlMs: number = 5 * 60 * 1000): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }
  
  /**
   * Delete value from cache
   * @param key - Cache key
   */
  delete(key: string): void {
    this.store.delete(key);
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear();
  }
  
  /**
   * Check if key exists in cache and is not expired
   * @param key - Cache key
   * @returns True if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
  
  /**
   * Get or set value in cache
   * @param key - Cache key
   * @param factory - Function to generate value if not in cache
   * @param ttlMs - Time to live in milliseconds
   * @returns Cached or newly generated value
   */
  async getOrSet(
    key: string,
    factory: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get(key);
    
    if (cached !== undefined) {
      return cached;
    }
    
    const value = await factory();
    this.set(key, value, ttlMs);
    return value;
  }
  
  /**
   * Remove expired entries from cache
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
  
  /**
   * Get cache statistics
   * @returns Object with cache stats
   */
  getStats(): {
    size: number;
    keys: string[];
  } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

/**
 * Default cache instance
 */
export const cache = new Cache();

/**
 * Create a new cache instance
 * @returns New cache instance
 */
export function createCache<T = any>(): Cache<T> {
  return new Cache<T>();
}

/**
 * Cache key generators for common patterns
 */
export const CacheKeys = {
  /**
   * Generate cache key for user data
   * @param userId - User ID
   * @returns Cache key
   */
  user: (userId: string) => `user:${userId}`,
  
  /**
   * Generate cache key for user list
   * @param role - User role filter
   * @returns Cache key
   */
  users: (role?: string) => `users:${role || 'all'}`,
  
  /**
   * Generate cache key for vehicle data
   * @param vehicleId - Vehicle ID
   * @returns Cache key
   */
  vehicle: (vehicleId: string) => `vehicle:${vehicleId}`,
  
  /**
   * Generate cache key for vehicle list
   * @param status - Vehicle status filter
   * @returns Cache key
   */
  vehicles: (status?: string) => `vehicles:${status || 'all'}`,
  
  /**
   * Generate cache key for lesson data
   * @param lessonId - Lesson ID
   * @returns Cache key
   */
  lesson: (lessonId: string) => `lesson:${lessonId}`,
  
  /**
   * Generate cache key for lesson list
   * @param filters - Filter parameters
   * @returns Cache key
   */
  lessons: (filters?: Record<string, any>) => 
    `lessons:${JSON.stringify(filters || {})}`,
  
  /**
   * Generate cache key for statistics
   * @param type - Statistics type
   * @returns Cache key
   */
  stats: (type: string) => `stats:${type}`,
  
  /**
   * Generate cache key for categories
   * @returns Cache key
   */
  categories: () => 'categories:all',
  
  /**
   * Generate cache key for transmission types
   * @returns Cache key
   */
  transmissionTypes: () => 'transmission-types:all',
};

/**
 * Cache TTL presets in milliseconds
 */
export const CacheTTL = {
  /** 30 seconds - for frequently changing data */
  SHORT: 30 * 1000,
  
  /** 5 minutes - default TTL */
  MEDIUM: 5 * 60 * 1000,
  
  /** 30 minutes - for relatively static data */
  LONG: 30 * 60 * 1000,
  
  /** 24 hours - for very static data */
  VERY_LONG: 24 * 60 * 60 * 1000,
};
