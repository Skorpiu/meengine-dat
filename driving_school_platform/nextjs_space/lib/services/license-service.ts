
/**
 * License Management Service
 * 
 * Handles license verification, feature access control, and organization management
 */

import { db } from '@/lib/db';
import type { FeatureKey } from '@/lib/config/license-features';

export class LicenseService {
  /**
   * Check if a feature is enabled for an organization
   */
  static async isFeatureEnabled(
    organizationId: string | null,
    featureKey: FeatureKey
  ): Promise<boolean> {
    if (!organizationId) {
      return false;
    }

    try {
      const feature = await db.organizationFeature.findUnique({
        where: {
          organizationId_featureKey: {
            organizationId,
            featureKey,
          },
        },
      });

      return feature?.isEnabled ?? false;
    } catch (error) {
      console.error('Error checking feature status:', error);
      return false;
    }
  }

  /**
   * Get all enabled features for an organization
   */
  static async getEnabledFeatures(organizationId: string): Promise<string[]> {
    try {
      const features = await db.organizationFeature.findMany({
        where: {
          organizationId,
          isEnabled: true,
        },
        select: {
          featureKey: true,
        },
      });

      return features.map((f: { featureKey: string }) => f.featureKey);
    } catch (error) {
      console.error('Error fetching enabled features:', error);
      return [];
    }
  }

  /**
   * Enable a feature for an organization
   */
  static async enableFeature(
    organizationId: string,
    featureKey: FeatureKey,
    enabledBy?: string
  ): Promise<boolean> {
    try {
      await db.organizationFeature.upsert({
        where: {
          organizationId_featureKey: {
            organizationId,
            featureKey,
          },
        },
        create: {
          organizationId,
          featureKey,
          isEnabled: true,
          enabledAt: new Date(),
          enabledBy,
        },
        update: {
          isEnabled: true,
          enabledAt: new Date(),
          enabledBy,
        },
      });

      return true;
    } catch (error) {
      console.error('Error enabling feature:', error);
      return false;
    }
  }

  /**
   * Disable a feature for an organization
   */
  static async disableFeature(
    organizationId: string,
    featureKey: FeatureKey
  ): Promise<boolean> {
    try {
      await db.organizationFeature.upsert({
        where: {
          organizationId_featureKey: {
            organizationId,
            featureKey,
          },
        },
        create: {
          organizationId,
          featureKey,
          isEnabled: false,
          disabledAt: new Date(),
        },
        update: {
          isEnabled: false,
          disabledAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      console.error('Error disabling feature:', error);
      return false;
    }
  }

  /**
   * Activate a license key
   */
  static async activateLicenseKey(
    organizationId: string,
    licenseKey: string
  ): Promise<{ success: boolean; message: string; features?: string[] }> {
    try {
      // Find the license key
      const license = await db.licenseKey.findUnique({
        where: { key: licenseKey },
      });

      if (!license) {
        return { success: false, message: 'Invalid license key' };
      }

      if (license.organizationId !== organizationId) {
        return { success: false, message: 'License key not valid for this organization' };
      }

      if (!license.isActive) {
        return { success: false, message: 'License key has been deactivated' };
      }

      if (license.isUsed) {
        return { success: false, message: 'License key has already been used' };
      }

      if (license.expiresAt && license.expiresAt < new Date()) {
        return { success: false, message: 'License key has expired' };
      }

      // Activate the features
      for (const featureKey of license.featureKeys) {
        await this.enableFeature(organizationId, featureKey as FeatureKey);
      }

      // Mark the license as used
      await db.licenseKey.update({
        where: { id: license.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'License key activated successfully',
        features: license.featureKeys,
      };
    } catch (error) {
      console.error('Error activating license key:', error);
      return { success: false, message: 'Error activating license key' };
    }
  }

  /**
   * Get organization details with features
   */
  static async getOrganizationWithFeatures(organizationId: string) {
    try {
      return await db.organization.findUnique({
        where: { id: organizationId },
        include: {
          features: {
            where: { isEnabled: true },
          },
          users: {
            select: {
              id: true,
              email: true,
              role: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    } catch (error) {
      console.error('Error fetching organization:', error);
      return null;
    }
  }

  /**
   * Create a new license key
   */
  static async createLicenseKey(
    organizationId: string,
    featureKeys: FeatureKey[],
    expiresAt?: Date,
    notes?: string,
    createdBy?: string
  ): Promise<{ success: boolean; key?: string; message?: string }> {
    try {
      // Generate a unique license key
      const key = `LIC-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`.toUpperCase();

      await db.licenseKey.create({
        data: {
          organizationId,
          key,
          featureKeys,
          expiresAt,
          notes,
          createdBy,
        },
      });

      return { success: true, key };
    } catch (error) {
      console.error('Error creating license key:', error);
      return { success: false, message: 'Error creating license key' };
    }
  }
}
