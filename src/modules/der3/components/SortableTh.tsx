import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SortState } from './useTableSort';

interface Props {
  children: React.ReactNode;
  sortKey: string;
  sort: SortState;
  onToggle: (key: string) => void;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

// Drop-in replacement for <th> that toggles sort on click and shows
// an arrow indicator when active.
export function SortableTh({ children, sortKey, sort, onToggle, className, align = 'start' }: Props) {
  const active = sort?.key === sortKey;
  const dir = active ? sort?.dir : null;
  return (
    <th className={cn('select-none', className)}>
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        className={cn(
          'inline-flex items-center gap-1.5 cursor-pointer transition-colors hover:text-primary',
          active ? 'text-primary' : 'text-current',
          align === 'center' && 'justify-center w-full',
          align === 'end' && 'justify-end w-full'
        )}
        title={active ? (dir === 'asc' ? 'Click for descending' : 'Click to clear') : 'Click to sort'}
      >
        <span>{children}</span>
        {active ? (
          dir === 'asc'
            ? <ArrowUp className="w-3 h-3" />
            : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-40" />
        )}
      </button>
    </th>
  );
}
