
/**
 * Loading Overlay Component
 * Full-screen or container overlay with loading spinner
 * @module components/ui/loading-overlay
 */

import { LoadingSpinner } from './loading-spinner';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isLoading: boolean;
  label?: string;
  fullScreen?: boolean;
  className?: string;
}

/**
 * Loading overlay that covers the parent container or full screen
 */
export function LoadingOverlay({
  isLoading,
  label,
  fullScreen = false,
  className,
}: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-background/80 backdrop-blur-sm z-50',
        fullScreen ? 'fixed inset-0' : 'absolute inset-0',
        className
      )}
    >
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}
