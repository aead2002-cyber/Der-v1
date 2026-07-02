import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/shared/ui/Button';

export function LegalFormModal({ open, title, onOpenChange, onSubmit, children, loading = false }: {
  open: boolean;
  title: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl rounded-3xl border-border-subtle shadow-[var(--der3-shadow-card)]">
        <form onSubmit={onSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle className="text-right text-xl font-black text-text-main">{title}</DialogTitle>
            <DialogDescription className="text-right text-sm text-text-muted">أكمل البيانات المطلوبة ثم احفظ.</DialogDescription>
          </DialogHeader>
          {children}
          <DialogFooter className="gap-3 bg-transparent p-0 sm:justify-start">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button type="submit" disabled={loading}>{loading ? 'جاري الحفظ...' : 'حفظ'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
