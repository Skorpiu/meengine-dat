
/**
 * Configuration utilities for system settings, feature flags, and user preferences
 * @module lib/config-utils
 */

import { prisma } from './db';

export type SettingType = string;

/**
 * Parse setting value based on type
 */
export function parseSettingValue(value: string, type: SettingType): any {
  switch (type) {
    case 'INTEGER':
      return parseInt(value, 10);
    case 'BOOLEAN':
      return value === 'true' || value === '1';
    case 'DECIMAL':
      return parseFloat(value);
    case 'JSON':
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    case 'STRING':
    default:
      return value;
  }
}

/**
 * Stringify setting value for storage
 */
export function stringifySettingValue(value: any, type: SettingType): string {
  switch (type) {
    case 'JSON':
      return typeof value === 'string' ? value : JSON.stringify(value);
    case 'BOOLEAN':
      return value ? 'true' : 'false';
    default:
      return String(value);
  }
}

/**
 * Get a system setting by key with type parsing
 */
export async function getSystemSetting<T = any>(
  key: string,
  defaultValue?: T
): Promise<T | undefined> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { settingKey: key },
    });

    if (!setting) {
      return defaultValue;
    }

    return parseSettingValue(setting.settingValue, setting.settingType) as T;
  } catch (error) {
    console.error(`Error fetching setting ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Set a system setting
 */
export async function setSystemSetting(
  key: string,
  value: any,
  type: SettingType = 'STRING',
  options?: {
    description?: string;
    category?: string;
    isPublic?: boolean;
    updatedBy?: string;
  }
): Promise<void> {
  const stringValue = stringifySettingValue(value, type);

  await prisma.systemSetting.upsert({
    where: { settingKey: key },
    update: {
      settingValue: stringValue,
      settingType: type as any,
      ...options,
    },
    create: {
      settingKey: key,
      settingValue: stringValue,
      settingType: type as any,
      ...options,
    },
  });
}

/**
 * Check if a feature flag is enabled for a user
 */
export async function isFeatureEnabled(
  flagKey: string,
  userId?: string,
  userRole?: string
): Promise<boolean> {
  try {
    const flag = await prisma.featureFlag.findUnique({
      where: { flagKey },
    });

    if (!flag) {
      return false; // Flag doesn't exist, feature disabled
    }

    // Check if flag is globally disabled
    if (!flag.isEnabled) {
      return false;
    }

    // Check expiration
    if (flag.expiresAt && flag.expiresAt < new Date()) {
      return false;
    }

    // Check user-specific targeting
    if (userId && flag.enabledForUsers.length > 0) {
      return flag.enabledForUsers.includes(userId);
    }

    // Check role-based targeting
    if (userRole && flag.enabledForRoles.length > 0) {
      return flag.enabledForRoles.includes(userRole);
    }

    // Check rollout percentage (deterministic based on user ID)
    if (flag.rolloutPercent < 100 && userId) {
      const hash = simpleHash(userId + flagKey);
      return (hash % 100) < flag.rolloutPercent;
    }

    // If rollout is 100% and no specific targeting, enable for all
    return flag.rolloutPercent === 100 || flag.enabledForRoles.length === 0;
  } catch (error) {
    console.error(`Error checking feature flag ${flagKey}:`, error);
    return false;
  }
}

/**
 * Simple hash function for rollout percentage calculation
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get user preferences with defaults
 */
export async function getUserPreferences(userId: string) {
  try {
    let preferences = await prisma.userPreference.findUnique({
      where: { userId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await prisma.userPreference.create({
        data: { userId },
      });
    }

    return preferences;
  } catch (error) {
    console.error(`Error fetching user preferences for ${userId}:`, error);
    return null;
  }
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: string,
  updates: Partial<any>
) {
  try {
    return await prisma.userPreference.upsert({
      where: { userId },
      update: updates,
      create: {
        userId,
        ...updates,
      },
    });
  } catch (error) {
    console.error(`Error updating user preferences for ${userId}:`, error);
    throw error;
  }
}

/**
 * Log configuration change
 */
export async function logConfigurationChange(
  entityType: 'SystemSetting' | 'FeatureFlag' | 'UserPreference',
  entityId: string,
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'ENABLED' | 'DISABLED',
  options: {
    entityKey?: string;
    oldValue?: any;
    newValue?: any;
    changedBy?: string;
    changedByRole?: string;
    changeReason?: string;
    ipAddress?: string;
  }
) {
  try {
    await prisma.configurationHistory.create({
      data: {
        entityType,
        entityId,
        action,
        ...options,
      },
    });
  } catch (error) {
    console.error('Error logging configuration change:', error);
  }
}

/**
 * Get all feature flags for a user
 */
export async function getUserFeatureFlags(
  userId?: string,
  userRole?: string
): Promise<Record<string, boolean>> {
  try {
    const flags = await prisma.featureFlag.findMany({
      where: { isEnabled: true },
    });

    const result: Record<string, boolean> = {};

    for (const flag of flags) {
      result[flag.flagKey] = await isFeatureEnabled(flag.flagKey, userId, userRole);
    }

    return result;
  } catch (error) {
    console.error('Error fetching user feature flags:', error);
    return {};
  }
}

/**
 * Get all public system settings
 */
export async function getPublicSettings(): Promise<Record<string, any>> {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: { isPublic: true },
    });

    const result: Record<string, any> = {};

    for (const setting of settings) {
      result[setting.settingKey] = parseSettingValue(
        setting.settingValue,
        setting.settingType
      );
    }

    return result;
  } catch (error) {
    console.error('Error fetching public settings:', error);
    return {};
  }
}
