
/**
 * React Hook for License Management
 * 
 * Provides client-side feature access control
 */

import { useSession } from 'next-auth/react';
import useSWR from 'swr';

interface LicenseFeature {
  key: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  isEnabled: boolean;
}

interface LicenseData {
  organizationId: string;
  organizationName: string;
  subscriptionTier: string;
  features: LicenseFeature[];
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useLicense() {
  const { data: session, status } = useSession() || {};
  
  const { data, error, isLoading, mutate } = useSWR<LicenseData>(
    session?.user && status === 'authenticated' ? '/api/admin/license/features' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  /**
   * Check if a feature is enabled
   */
  const isFeatureEnabled = (featureKey: string): boolean => {
    if (!data || !data.features) return false;
    const feature = data.features.find(f => f.key === featureKey);
    return feature?.isEnabled ?? false;
  };

  /**
   * Toggle a feature on or off
   */
  const toggleFeature = async (featureKey: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/admin/license/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureKey, enabled }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update feature');
      }

      // Revalidate the data
      await mutate();

      return { success: true };
    } catch (error) {
      console.error('Error toggling feature:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  /**
   * Activate a license key
   */
  const activateLicense = async (licenseKey: string) => {
    try {
      const response = await fetch('/api/admin/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to activate license');
      }

      // Revalidate the data
      await mutate();

      return { success: true, message: result.message, features: result.features };
    } catch (error) {
      console.error('Error activating license:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  return {
    license: data,
    features: data?.features ?? [],
    isLoading,
    error,
    isFeatureEnabled,
    toggleFeature,
    activateLicense,
    refresh: mutate,
  };
}
