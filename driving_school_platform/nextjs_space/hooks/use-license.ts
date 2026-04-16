/**
 * React Hook for License Management
 *
 * Provides client-side feature access control
 */

import { useSession } from "next-auth/react";
import useSWR from "swr";
import {
  FEATURE_DEFINITIONS,
  type FeatureKey,
  isFeatureKey,
} from "@/lib/config/license-features";
import type {
  AdminLicenseActivatePostRequest,
  AdminLicenseActivatePostResponse,
  AdminLicenseEntitlementsGetResponse,
  AdminLicenseFeaturesPostRequest,
  AdminLicenseFeaturesPostResponse,
} from "@/lib/platform/contracts/license-entitlements";

interface LicenseFeature {
  key: FeatureKey;
  name: string;
  description: string;
  category: string;
  icon: string;
  isEnabled: boolean;
}

interface LicenseData {
  organizationId: string;
  organizationName: string | null;
  subscriptionTier: string | null;
  features: LicenseFeature[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useLicense() {
  const { data: session, status } = useSession() || {};

  const { data, error, isLoading, mutate } =
    useSWR<AdminLicenseEntitlementsGetResponse>(
      session?.user && status === "authenticated"
        ? "/api/admin/license/features"
        : null,
      fetcher,
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      },
    );

  const enabledKeySet = new Set<FeatureKey>(
    (data?.enabledFeatureKeys ?? []).filter(
      (k): k is FeatureKey => typeof k === "string" && isFeatureKey(k),
    ),
  );

  const features: LicenseFeature[] = Object.values(FEATURE_DEFINITIONS).map(
    (f) => ({
      key: f.key,
      name: f.name,
      description: f.description,
      category: f.category,
      icon: f.icon,
      isEnabled: enabledKeySet.has(f.key),
    }),
  );

  const license: LicenseData | undefined = data
    ? {
        organizationId: data.organizationId,
        organizationName: data.organizationName,
        subscriptionTier: data.subscriptionTier,
        features,
      }
    : undefined;

  /**
   * Check if a feature is enabled
   */
  const isFeatureEnabled = (featureKey: string): boolean => {
    if (!featureKey || typeof featureKey !== "string") return false;
    if (!isFeatureKey(featureKey)) return false;
    return enabledKeySet.has(featureKey);
  };

  /**
   * Toggle a feature on or off
   */
  const toggleFeature = async (featureKey: string, enabled: boolean) => {
    try {
      const body: AdminLicenseFeaturesPostRequest = {
        featureKey: featureKey as FeatureKey,
        enabled,
      };

      const response = await fetch("/api/admin/license/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update feature");
      }

      const _result =
        (await response.json()) as AdminLicenseFeaturesPostResponse;

      // Revalidate the data
      await mutate();

      return { success: true };
    } catch (error) {
      console.error("Error toggling feature:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  /**
   * Activate a license key
   */
  const activateLicense = async (licenseKey: string) => {
    try {
      const body: AdminLicenseActivatePostRequest = { licenseKey };

      const response = await fetch("/api/admin/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = (await response.json()) as
        | AdminLicenseActivatePostResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in result
            ? result.error || "Failed to activate license"
            : "Failed to activate license",
        );
      }

      // Revalidate the data
      await mutate();

      const ok = result as AdminLicenseActivatePostResponse;
      return {
        success: true,
        message: ok.message,
        features: ok.features,
      };
    } catch (error) {
      console.error("Error activating license:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  return {
    license,
    features,
    isLoading,
    error,
    isFeatureEnabled,
    toggleFeature,
    activateLicense,
    refresh: mutate,
  };
}
