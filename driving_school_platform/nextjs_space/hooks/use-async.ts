
/**
 * Custom hook for handling async operations with loading states
 * @module hooks/use-async
 */

import { useState, useCallback } from 'react';
import { showError, showSuccess } from '@/lib/client-utils';

interface UseAsyncOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  showErrorToast?: boolean;
}

interface UseAsyncReturn<T> {
  execute: (...args: any[]) => Promise<T | undefined>;
  isLoading: boolean;
  error: Error | null;
  data: T | null;
  reset: () => void;
}

/**
 * Hook for handling async operations with automatic loading states and error handling
 * @param asyncFunction - Async function to execute
 * @param options - Configuration options
 * @returns Object with execute function, loading state, error, and data
 */
export function useAsync<T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions = {}
): UseAsyncReturn<T> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const {
    onSuccess,
    onError,
    successMessage,
    showErrorToast = true,
  } = options;

  const execute = useCallback(
    async (...args: any[]) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await asyncFunction(...args);
        setData(result);

        if (successMessage) {
          showSuccess(successMessage);
        }

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('An error occurred');
        setError(error);

        if (showErrorToast) {
          showError(error);
        }

        if (onError) {
          onError(error);
        }

        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [asyncFunction, onSuccess, onError, successMessage, showErrorToast]
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { execute, isLoading, error, data, reset };
}
