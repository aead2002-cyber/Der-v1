import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Platform } from '@/shared/types/platform';

interface PlatformCardProps {
  platform: Platform;
  onClick: () => void;
  disabled?: boolean;
}

export function PlatformCard({ platform, onClick, disabled = false }: PlatformCardProps) {
  const initial = (platform.nameEn || platform.code).trim().charAt(0).toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'text-left w-full rounded-[24px] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        disabled ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1'
      )}
    >
      <Card className="h-full overflow-hidden border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <div className="flex h-full flex-col gap-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0">
              {platform.logoUrl ? (
                <img
                  src={platform.logoUrl}
                  alt={platform.nameEn}
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <span className="text-xl font-black text-slate-700">{initial}</span>
              )}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl font-black text-slate-900">{platform.nameAr}</h3>
            <p className="text-sm font-semibold tracking-wide text-slate-500">{platform.nameEn}</p>
          </div>

          <p className="text-sm leading-7 text-slate-600">{platform.descriptionAr}</p>

          <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
              {platform.code}
            </span>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
              {platform.isActive ? 'مفعل' : 'غير مفعل'}
            </span>
          </div>
        </div>
      </Card>
    </button>
  );
}
