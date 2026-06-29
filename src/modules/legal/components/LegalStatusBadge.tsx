import React from 'react';
import { cn } from '@/lib/utils';

export function LegalStatusBadge({ status, className }: { status: string; className?: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized.includes('active') || normalized.includes('open') || normalized.includes('مفتوح') || normalized.includes('قائمة') || normalized.includes('نشط')
    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
    : normalized.includes('closed') || normalized.includes('مغلق') || normalized.includes('مغلقة') || normalized.includes('inactive')
      ? 'bg-slate-100 text-slate-700 border-slate-200'
      : 'bg-sky-50 text-sky-700 border-sky-100';
  return <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-bold', tone, className)}>{status}</span>;
}
