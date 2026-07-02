import React from 'react';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';

export function LegalConfirmDialog({ open, title, description, confirmLabel = 'تأكيد', cancelLabel = 'إلغاء', onConfirm, onOpenChange, loading = false }: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
}) {
  return (
    <ConfirmDialog
      open={open}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      confirmDisabled={loading}
    />
  );
}
