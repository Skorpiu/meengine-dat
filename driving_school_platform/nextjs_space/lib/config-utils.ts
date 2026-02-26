/**
 * Configuration utilities for system settings, feature flags, and user preferences
 * @module lib/config-utils
 */

import { prisma } from "./db";
import { Prisma } from "@prisma/client";

export type SettingType = "STRING" | "INTEGER" | "DECIMAL" | "BOOLEAN" | "JSON";

/**
 * Parse setting value based on type
 */
export function parseSettingValue(value: string, type: SettingType): unknown {
  switch (type) {
    case "INTEGER":
      return parseInt(value, 10);
    case "BOOLEAN":
      return value === "true" || value === "1";
    case "DECIMAL":
      return parseFloat(value);
    case "JSON":
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    case "STRING":
    default:
      return value;
  }
}

/**
 * Stringify setting value for storage
 */
export function stringifySettingValue(
  value: unknown,
  type: SettingType,
): string {
  switch (type) {
    case "JSON":
      return typeof value === "string" ? value : JSON.stringify(value);
    case "BOOLEAN":
      return value ? "true" : "false";
    default:
      return String(value);
  }
}

/**
 * Get a system setting by key with type parsing
 */
export async function getSystemSetting<T = unknown>(
  key: string,
  defaultValue?: T,
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
  value: unknown,
  type: SettingType = "STRING",
  options?: {
    description?: string;
    category?: string;
    isPublic?: boolean;
    updatedBy?: string;
  },
): Promise<void> {
  const stringValue = stringifySettingValue(value, type);

  await prisma.systemSetting.upsert({
    where: { settingKey: key },
    update: {
      settingValue: stringValue,
      settingType: type,
      ...options,
    },
    create: {
      settingKey: key,
      settingValue: stringValue,
      settingType: type,
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
  userRole?: string,
  organizationId?: string | null,
): Promise<boolean> {
  try {
    if (!organizationId) {
      return false;
    }

    const flag = await prisma.featureFlag.findFirst({
      where: { organizationId, flagKey },
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
      return hash % 100 < flag.rolloutPercent;
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
    hash = (hash << 5) - hash + char;
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
  updates: Partial<unknown>,
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

type PrismaJsonField = Exclude<
  Prisma.ConfigurationHistoryCreateInput["oldValue"],
  undefined
>;

// Prisma.JsonNull aparece tipado como {} | undefined em alguns clients.
// Fix: cast para o tipo exato que o create() aceita.
const PRISMA_JSON_NULL: PrismaJsonField =
  Prisma.JsonNull as unknown as PrismaJsonField;

function toPrismaJsonField(value: unknown): PrismaJsonField {
  if (value === null) return PRISMA_JSON_NULL;

  const t = typeof value;

  if (t === "string" || t === "number" || t === "boolean") return value;
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((v) =>
      toPrismaJsonField(v),
    ) as unknown as Prisma.InputJsonValue;
  }

  if (t === "object" && value) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = toPrismaJsonField(v);
    }
    return out as unknown as Prisma.InputJsonValue;
  }

  return String(value);
}

/**
 * Log configuration change
 */
export async function logConfigurationChange(
  entityType: "SystemSetting" | "FeatureFlag" | "UserPreference",
  entityId: string,
  action: "CREATED" | "UPDATED" | "DELETED" | "ENABLED" | "DISABLED",
  options: {
    organizationId?: string | null;
    entityKey?: string;
    oldValue?: unknown;
    newValue?: unknown;
    changedBy?: string;
    changedByRole?: string;
    changeReason?: string;
    ipAddress?: string;
  },
) {
  try {
    const { organizationId, oldValue, newValue, ...rest } = options;

    await prisma.configurationHistory.create({
      data: {
        entityType,
        entityId,
        action,
        organizationId: organizationId ?? null,
        ...rest,
        ...(oldValue !== undefined
          ? { oldValue: toPrismaJsonField(oldValue) }
          : {}),
        ...(newValue !== undefined
          ? { newValue: toPrismaJsonField(newValue) }
          : {}),
      },
    });
  } catch (error) {
    console.error("Error logging configuration change:", error);
  }
}

/**
 * Get all feature flags for a user
 */
export async function getUserFeatureFlags(
  userId?: string,
  userRole?: string,
  organizationId?: string | null,
): Promise<Record<string, boolean>> {
  try {
    if (!organizationId) {
      return {};
    }

    const flags = await prisma.featureFlag.findMany({
      where: { isEnabled: true, organizationId },
    });

    const result: Record<string, boolean> = {};

    for (const flag of flags) {
      result[flag.flagKey] = await isFeatureEnabled(
        flag.flagKey,
        userId,
        userRole,
        organizationId,
      );
    }

    return result;
  } catch (error) {
    console.error("Error fetching user feature flags:", error);
    return {};
  }
}

/**
 * Get all public system settings (scoped to an organization)
 */
export async function getPublicSettings(
  organizationId: string,
): Promise<Record<string, unknown>> {
  try {
    if (!organizationId) {
      return {};
    }

    const settings = await prisma.systemSetting.findMany({
      where: { isPublic: true, organizationId },
    });

    const result: Record<string, unknown> = {};

    for (const setting of settings) {
      result[setting.settingKey] = parseSettingValue(
        setting.settingValue,
        setting.settingType,
      );
    }

    return result;
  } catch (error) {
    console.error("Error fetching public settings:", error);
    return {};
  }
}
