
/**
 * Feature Gate Component
 * 
 * Conditionally renders content based on feature availability
 */

'use client';

import { useLicense } from '@/hooks/use-license';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradeMessage?: boolean;
}

export function FeatureGate({
  featureKey,
  children,
  fallback,
  showUpgradeMessage = true,
}: FeatureGateProps) {
  const { isFeatureEnabled, isLoading } = useLicense();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if feature is enabled
  const enabled = isFeatureEnabled(featureKey);

  if (enabled) {
    return <>{children}</>;
  }

  // Show fallback or upgrade message
  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradeMessage) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Premium Feature</AlertTitle>
          <AlertDescription>
            This feature requires an upgrade. Contact your administrator to unlock it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
}

/**
 * Feature Badge Component
 * Shows a badge if a feature is premium
 */
export function FeatureBadge({ featureKey }: { featureKey: string }) {
  const { isFeatureEnabled } = useLicense();
  const enabled = isFeatureEnabled(featureKey);

  if (enabled) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
      <Lock className="h-3 w-3" />
      Premium
    </span>
  );
}
