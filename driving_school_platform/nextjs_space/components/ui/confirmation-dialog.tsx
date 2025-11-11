
'use client';

/**
 * Confirmation Dialog Component
 * Provides a reusable confirmation dialog for destructive actions
 * @module components/ui/confirmation-dialog
 */

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmationDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description/message */
  description: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Whether the action is destructive (shows red button) */
  destructive?: boolean;
  /** Whether confirm button is loading */
  loading?: boolean;
}

/**
 * Reusable Confirmation Dialog
 * Shows a modal dialog asking user to confirm an action
 * 
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * 
 * <ConfirmationDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Delete Vehicle"
 *   description="Are you sure you want to delete this vehicle? This action cannot be undone."
 *   confirmText="Delete"
 *   onConfirm={handleDelete}
 *   destructive
 * />
 * ```
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  destructive = false,
  loading = false,
}: ConfirmationDialogProps): JSX.Element {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={destructive ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {loading ? 'Processing...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook for managing confirmation dialog state
 * Simplifies the usage of confirmation dialogs
 * 
 * @example
 * ```tsx
 * const confirm = useConfirmation();
 * 
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: 'Delete Vehicle',
 *     description: 'Are you sure?',
 *     destructive: true,
 *   });
 *   
 *   if (confirmed) {
 *     // Perform delete
 *   }
 * };
 * ```
 */
export function useConfirmation() {
  const [config, setConfig] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
    resolve?: (value: boolean) => void;
  }>({
    open: false,
    title: '',
    description: '',
  });

  const confirm = (options: {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig({
        ...options,
        open: true,
        resolve,
      });
    });
  };

  const handleConfirm = () => {
    config.resolve?.(true);
    setConfig((prev) => ({ ...prev, open: false }));
  };

  const handleCancel = () => {
    config.resolve?.(false);
    setConfig((prev) => ({ ...prev, open: false }));
  };

  const ConfirmationDialogComponent = () => (
    <AlertDialog open={config.open} onOpenChange={(open) => !open && handleCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
          <AlertDialogDescription>{config.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {config.cancelText || 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={config.destructive ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {config.confirmText || 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return {
    confirm,
    ConfirmationDialog: ConfirmationDialogComponent,
  };
}
