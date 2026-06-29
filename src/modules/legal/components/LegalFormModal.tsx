import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <form onSubmit={onSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle className="text-right text-xl font-black">{title}</DialogTitle>
            <DialogDescription className="text-right text-sm text-slate-500">أكمل البيانات المطلوبة ثم احفظ.</DialogDescription>
          </DialogHeader>
          {children}
          <DialogFooter className="gap-3 sm:justify-start">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button type="submit" disabled={loading}>{loading ? 'جاري الحفظ...' : 'حفظ'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
