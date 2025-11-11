
'use client';

/**
 * Pagination Component
 * Displays pagination controls for data tables
 * @module components/ui/pagination
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

interface PaginationProps {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Show page info (e.g., "Showing 1-10 of 100") */
  showInfo?: boolean;
  /** Total number of items (for info display) */
  totalItems?: number;
  /** Items per page (for info display) */
  pageSize?: number;
}

/**
 * Pagination Component
 * Provides page navigation with previous/next and direct page selection
 * 
 * @example
 * ```tsx
 * <Pagination
 *   currentPage={currentPage}
 *   totalPages={totalPages}
 *   onPageChange={setCurrentPage}
 *   showInfo
 *   totalItems={data.length}
 *   pageSize={10}
 * />
 * ```
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showInfo = false,
  totalItems,
  pageSize,
}: PaginationProps): JSX.Element {
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const getPageNumbers = (): (number | string)[] => {
    const delta = 2;
    const range: (number | string)[] = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      range.unshift('...');
    }
    if (totalPages > 0) {
      range.unshift(1);
    }

    if (currentPage + delta < totalPages - 1) {
      range.push('...');
    }
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  };

  const getPaginationInfo = (): string => {
    if (!totalItems || !pageSize) return '';
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);
    return `Showing ${startItem}-${endItem} of ${totalItems}`;
  };

  if (totalPages <= 1) {
    return showInfo && totalItems ? (
      <div className="text-sm text-muted-foreground">{getPaginationInfo()}</div>
    ) : (
      <></>
    );
  }

  return (
    <div className="flex items-center justify-between px-2">
      {showInfo && totalItems && pageSize ? (
        <div className="text-sm text-muted-foreground">{getPaginationInfo()}</div>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="ml-1">Previous</span>
        </Button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) =>
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(page as number)}
                className="min-w-[40px]"
              >
                {page}
              </Button>
            )
          )}
        </div>

        {/* Next Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
        >
          <span className="mr-1">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
