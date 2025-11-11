
'use client';

/**
 * Pagination Hook
 * Provides pagination state and utilities
 * @module hooks/use-pagination
 */

import { useState, useMemo } from 'react';
import { PAGINATION } from '@/lib/constants';

interface UsePaginationProps {
  /** Total number of items */
  totalItems: number;
  /** Initial page (default: 1) */
  initialPage?: number;
  /** Items per page (default: 10) */
  pageSize?: number;
}

interface UsePaginationReturn<T> {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Items per page */
  pageSize: number;
  /** Navigate to specific page */
  goToPage: (page: number) => void;
  /** Navigate to next page */
  nextPage: () => void;
  /** Navigate to previous page */
  prevPage: () => void;
  /** Check if there is a next page */
  hasNextPage: boolean;
  /** Check if there is a previous page */
  hasPrevPage: boolean;
  /** Get paginated items from array */
  getPaginatedItems: (items: T[]) => T[];
  /** Calculate pagination range (e.g., [1, 2, 3, '...', 10]) */
  getPageRange: () => (number | string)[];
  /** Pagination info text (e.g., "Showing 1-10 of 100") */
  getPaginationInfo: () => string;
}

/**
 * Hook for managing pagination state and utilities
 * 
 * @example
 * ```tsx
 * const {
 *   currentPage,
 *   totalPages,
 *   goToPage,
 *   nextPage,
 *   prevPage,
 *   getPaginatedItems,
 * } = usePagination({ totalItems: data.length });
 * 
 * const paginatedData = getPaginatedItems(data);
 * ```
 */
export function usePagination<T = any>({
  totalItems,
  initialPage = 1,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
}: UsePaginationProps): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / pageSize);
  }, [totalItems, pageSize]);

  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const nextPage = () => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const prevPage = () => {
    if (hasPrevPage) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const getPaginatedItems = (items: T[]): T[] => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return items.slice(startIndex, endIndex);
  };

  const getPageRange = (): (number | string)[] => {
    const delta = 2; // Number of pages to show before and after current page
    const range: (number | string)[] = [];
    const rangeWithDots: (number | string)[] = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const getPaginationInfo = (): string => {
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);
    return `Showing ${startItem}-${endItem} of ${totalItems}`;
  };

  return {
    currentPage,
    totalPages,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
    getPaginatedItems,
    getPageRange,
    getPaginationInfo,
  };
}
