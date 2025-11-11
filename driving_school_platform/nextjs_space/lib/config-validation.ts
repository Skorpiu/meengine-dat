
/**
 * Validation schemas for configuration management
 * @module lib/config-validation
 */

import { z } from 'zod';

/**
 * System Setting Schemas
 */
export const systemSettingSchema = z.object({
  settingKey: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Setting key must be lowercase with underscores'),
  settingValue: z.string().min(0),
  settingType: z.enum(['STRING', 'INTEGER', 'BOOLEAN', 'JSON', 'DECIMAL']),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  isPublic: z.boolean().optional(),
});

export const updateSystemSettingSchema = systemSettingSchema.partial().required({ settingKey: true });

/**
 * Feature Flag Schemas
 */
export const featureFlagSchema = z.object({
  flagKey: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Flag key must be lowercase with underscores'),
  flagName: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  isEnabled: z.boolean(),
  enabledForRoles: z.array(z.string()).optional().default([]),
  enabledForUsers: z.array(z.string()).optional().default([]),
  rolloutPercent: z.number().int().min(0).max(100).optional().default(0),
  environment: z.string().max(50).optional().default('production'),
  category: z.string().max(50).optional(),
  tags: z.array(z.string()).optional().default([]),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const updateFeatureFlagSchema = featureFlagSchema.partial().required({ flagKey: true });

/**
 * User Preferences Schemas
 */
export const userPreferencesSchema = z.object({
  // Interface
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  language: z.enum(['en', 'pt']).optional(),
  
  // Notifications
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  lessonReminders: z.boolean().optional(),
  examReminders: z.boolean().optional(),
  paymentReminders: z.boolean().optional(),
  promotionalEmails: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  
  // Dashboard
  defaultDashboardView: z.enum(['overview', 'calendar', 'list']).optional(),
  showCompletedLessons: z.boolean().optional(),
  lessonDisplayCount: z.number().int().min(1).max(20).optional(),
  
  // Calendar
  calendarView: z.enum(['day', 'week', 'month']).optional(),
  startOfWeek: z.enum(['monday', 'sunday']).optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
  
  // Privacy
  profileVisibility: z.enum(['public', 'school', 'private']).optional(),
  showProgressToInstructors: z.boolean().optional(),
  allowContactFromInstructors: z.boolean().optional(),
  
  // Accessibility
  fontSize: z.enum(['small', 'medium', 'large']).optional(),
  highContrast: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  
  // Custom
  customSettings: z.record(z.any()).optional(),
});

/**
 * Configuration History Schema
 */
export const configurationHistorySchema = z.object({
  entityType: z.enum(['SystemSetting', 'FeatureFlag', 'UserPreference']),
  entityId: z.string(),
  entityKey: z.string().optional(),
  action: z.enum(['CREATED', 'UPDATED', 'DELETED', 'ENABLED', 'DISABLED']),
  oldValue: z.any().optional(),
  newValue: z.any().optional(),
  changeReason: z.string().max(500).optional(),
});

/**
 * Query Schemas
 */
export const settingsQuerySchema = z.object({
  category: z.string().optional(),
  isPublic: z.boolean().optional(),
  search: z.string().optional(),
});

export const featureFlagsQuerySchema = z.object({
  environment: z.string().optional(),
  category: z.string().optional(),
  isEnabled: z.boolean().optional(),
  search: z.string().optional(),
});

export const configHistoryQuerySchema = z.object({
  entityType: z.enum(['SystemSetting', 'FeatureFlag', 'UserPreference']).optional(),
  entityId: z.string().optional(),
  action: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});
