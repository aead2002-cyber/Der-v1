import React from 'react';

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
    <div className={open ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' : 'hidden'}>
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <h3 className="text-right text-xl font-black text-slate-900">{title}</h3>
        <p className="mt-3 text-right text-sm leading-7 text-slate-600">{description}</p>
        <div className="mt-6 flex justify-start gap-3">
          <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" onClick={() => onOpenChange(false)}>{cancelLabel}</button>
          <button type="button" className="rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60" onClick={onConfirm} disabled={loading}>{loading ? 'جاري التنفيذ...' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
