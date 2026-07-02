import * as React from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConfirmDialogProps {
  open: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  destructive?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  confirmDisabled,
  onConfirm,
  onOpenChange,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-xl border-none shadow-2xl">
        <DialogHeader className="space-y-3">
          <div
            className={
              destructive
                ? 'flex items-center gap-2 text-danger font-bold'
                : 'flex items-center gap-2 text-text-main font-bold'
            }
          >
            {destructive ? <AlertTriangle className="w-5 h-5" /> : null}
            <DialogTitle className="text-xl font-bold text-text-main">{title}</DialogTitle>
          </div>
          {description ? <p className="text-text-muted text-sm leading-relaxed">{description}</p> : null}
        </DialogHeader>
        <DialogFooter className="bg-transparent border-t-0 p-0 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg px-5 font-bold">
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={
              destructive
                ? 'bg-danger hover:bg-danger/90 text-white font-bold px-6'
                : 'bg-primary hover:bg-primary/90 text-white font-bold px-6'
            }
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
