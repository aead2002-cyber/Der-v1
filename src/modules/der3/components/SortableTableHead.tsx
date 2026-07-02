import React from 'react';
import { TableHead } from '@/components/ui/table';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SortState } from './useTableSort';

interface Props {
  children: React.ReactNode;
  sortKey: string;
  sort: SortState;
  onToggle: (key: string) => void;
  className?: string;
}

export function SortableTableHead({ children, sortKey, sort, onToggle, className }: Props) {
  const active = sort?.key === sortKey;
  const dir = active ? sort?.dir : null;
  return (
    <TableHead className={cn('select-none', className)}>
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        className={cn(
          'inline-flex items-center gap-1.5 cursor-pointer transition-colors hover:text-primary font-bold',
          active ? 'text-primary' : 'text-current'
        )}
      >
        <span>{children}</span>
        {active
          ? (dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
          : <ArrowUpDown className="w-3 h-3 opacity-40" />}
      </button>
    </TableHead>
  );
}
