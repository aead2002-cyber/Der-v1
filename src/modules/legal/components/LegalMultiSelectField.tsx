import React from 'react';
import { cn } from '@/lib/utils';

export interface LegalMultiSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface LegalMultiSelectFieldProps {
  label: string;
  helperText?: string;
  options: LegalMultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  emptyText?: string;
}

export function LegalMultiSelectField({
  label,
  helperText,
  options,
  value,
  onChange,
  emptyText = 'لا توجد خيارات متاحة',
}: LegalMultiSelectFieldProps) {
  const selectedSet = React.useMemo(() => new Set(value), [value]);

  const toggle = (itemValue: string) => {
    const next = new Set(selectedSet);
    if (next.has(itemValue)) {
      next.delete(itemValue);
    } else {
      next.add(itemValue);
    }
    onChange(Array.from(next));
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-bold text-text-main">{label}</p>
        {helperText ? <p className="text-xs leading-6 text-text-muted">{helperText}</p> : null}
      </div>
      {options.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-background p-4 text-sm text-text-muted">{emptyText}</div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map(option => {
            const active = selectedSet.has(option.value);
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => toggle(option.value)}
                className={cn(
                  'rounded-2xl border px-4 py-3 text-right transition-colors',
                  active ? 'border-primary bg-primary text-white shadow-[var(--der3-shadow-button)]' : 'border-border-subtle bg-card text-text-main hover:bg-background'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">{option.label}</p>
                    {option.description ? <p className={cn('mt-1 text-xs leading-6', active ? 'text-white/70' : 'text-text-muted')}>{option.description}</p> : null}
                  </div>
                  <span className={cn('mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black', active ? 'border-white bg-white text-primary' : 'border-border-subtle text-text-muted')}>
                    {active ? '✓' : ''}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
