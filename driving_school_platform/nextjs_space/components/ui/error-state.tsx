
/**
 * Error State Component
 * Display error messages with retry option
 * @module components/ui/error-state
 */

import { AlertCircle } from 'lucide-react';
import { Button } from './button';
import { Alert, AlertDescription, AlertTitle } from './alert';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * Error state component with optional retry button
 */
export function ErrorState({
  title = 'Error',
  message,
  onRetry,
  retryLabel = 'Try Again',
}: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="mt-2">
          {message}
          {onRetry && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="w-full"
              >
                {retryLabel}
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
