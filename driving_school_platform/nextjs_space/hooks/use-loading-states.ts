
/**
 * Custom hook for managing multiple loading states
 * @module hooks/use-loading-states
 */

import { useState, useCallback } from 'react';

interface UseLoadingStatesReturn {
  loadingStates: Record<string, boolean>;
  setLoading: (key: string, isLoading: boolean) => void;
  isLoading: (key: string) => boolean;
  resetAll: () => void;
}

/**
 * Hook for managing multiple loading states by key
 * @returns Object with loading state management functions
 */
export function useLoadingStates(): UseLoadingStatesReturn {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((key: string, isLoading: boolean) => {
    setLoadingStates((prev) => ({
      ...prev,
      [key]: isLoading,
    }));
  }, []);

  const isLoading = useCallback(
    (key: string) => {
      return loadingStates[key] || false;
    },
    [loadingStates]
  );

  const resetAll = useCallback(() => {
    setLoadingStates({});
  }, []);

  return { loadingStates, setLoading, isLoading, resetAll };
}
