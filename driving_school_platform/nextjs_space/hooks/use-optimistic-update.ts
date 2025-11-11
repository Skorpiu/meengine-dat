
'use client';

/**
 * Optimistic Update Hook
 * Provides optimistic UI updates for better perceived performance
 * @module hooks/use-optimistic-update
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UseOptimisticUpdateOptions<T> {
  /** Current data */
  data: T;
  /** Function to update data on server */
  updateFn: (data: T) => Promise<T>;
  /** Callback on success */
  onSuccess?: (data: T) => void;
  /** Callback on error */
  onError?: (error: Error, rollbackData: T) => void;
  /** Success message to show */
  successMessage?: string;
  /** Error message to show */
  errorMessage?: string;
}

/**
 * Hook for implementing optimistic updates
 * Updates UI immediately, then syncs with server
 * Rolls back on failure
 * 
 * @example
 * ```tsx
 * const { data, update, isLoading } = useOptimisticUpdate({
 *   data: vehicle,
 *   updateFn: async (updated) => {
 *     const res = await fetch('/api/vehicles', {
 *       method: 'PATCH',
 *       body: JSON.stringify(updated),
 *     });
 *     return res.json();
 *   },
 *   successMessage: 'Vehicle updated',
 * });
 * 
 * // Update immediately shows in UI
 * update({ ...vehicle, status: 'AVAILABLE' });
 * ```
 */
export function useOptimisticUpdate<T>({
  data: initialData,
  updateFn,
  onSuccess,
  onError,
  successMessage,
  errorMessage,
}: UseOptimisticUpdateOptions<T>) {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const update = useCallback(
    async (newData: T) => {
      // Store original data for rollback
      const rollbackData = data;

      try {
        // Optimistic update - update UI immediately
        setData(newData);
        setIsLoading(true);

        // Perform actual update
        const result = await updateFn(newData);

        // Update with server response
        setData(result);

        // Show success message
        if (successMessage) {
          toast.success(successMessage);
        }

        // Call success callback
        onSuccess?.(result);

        return result;
      } catch (error) {
        // Rollback to original data
        setData(rollbackData);

        // Show error message
        const message = errorMessage || 'Update failed. Please try again.';
        toast.error(message);

        // Call error callback
        onError?.(error as Error, rollbackData);

        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [data, updateFn, onSuccess, onError, successMessage, errorMessage]
  );

  return {
    data,
    update,
    isLoading,
    setData, // Allow manual data updates if needed
  };
}

/**
 * Hook for optimistic list updates (add, remove, update items)
 */
export function useOptimisticList<T extends { id: string | number }>({
  items: initialItems,
  addFn,
  removeFn,
  updateFn,
}: {
  items: T[];
  addFn?: (item: T) => Promise<T>;
  removeFn?: (id: string | number) => Promise<void>;
  updateFn?: (item: T) => Promise<T>;
}) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Add item optimistically
   */
  const addItem = useCallback(
    async (newItem: T) => {
      const rollbackItems = items;

      try {
        // Optimistic add
        setItems((prev) => [...prev, newItem]);
        setIsLoading(true);

        // Perform actual add
        if (addFn) {
          const result = await addFn(newItem);
          // Update with server response
          setItems((prev) => prev.map((item) => (item.id === newItem.id ? result : item)));
          toast.success('Item added successfully');
          return result;
        }
        return newItem;
      } catch (error) {
        // Rollback
        setItems(rollbackItems);
        toast.error('Failed to add item');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [items, addFn]
  );

  /**
   * Remove item optimistically
   */
  const removeItem = useCallback(
    async (id: string | number) => {
      const rollbackItems = items;

      try {
        // Optimistic remove
        setItems((prev) => prev.filter((item) => item.id !== id));
        setIsLoading(true);

        // Perform actual remove
        if (removeFn) {
          await removeFn(id);
          toast.success('Item removed successfully');
        }
      } catch (error) {
        // Rollback
        setItems(rollbackItems);
        toast.error('Failed to remove item');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [items, removeFn]
  );

  /**
   * Update item optimistically
   */
  const updateItem = useCallback(
    async (updatedItem: T) => {
      const rollbackItems = items;

      try {
        // Optimistic update
        setItems((prev) =>
          prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
        );
        setIsLoading(true);

        // Perform actual update
        if (updateFn) {
          const result = await updateFn(updatedItem);
          // Update with server response
          setItems((prev) =>
            prev.map((item) => (item.id === result.id ? result : item))
          );
          toast.success('Item updated successfully');
          return result;
        }
        return updatedItem;
      } catch (error) {
        // Rollback
        setItems(rollbackItems);
        toast.error('Failed to update item');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [items, updateFn]
  );

  return {
    items,
    addItem,
    removeItem,
    updateItem,
    isLoading,
    setItems, // Allow manual updates
  };
}
