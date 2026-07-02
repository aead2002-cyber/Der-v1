import * as React from 'react';

import { cn } from '@/lib/utils';

interface DataTableProps extends React.ComponentProps<'table'> {
  containerClassName?: string;
}

export function DataTable({
  className,
  containerClassName,
  ...props
}: DataTableProps) {
  return (
    <div className={cn('table-container', containerClassName)}>
      <div className="overflow-x-auto">
        <table className={cn('w-full', className)} {...props} />
      </div>
    </div>
  );
}

export function DataTableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={cn(className)} {...props} />;
}

export function DataTableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={cn(className)} {...props} />;
}

export function DataTableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return <tr className={cn('hover:bg-muted-hover transition-colors', className)} {...props} />;
}

export function DataTableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return <th className={cn('text-left', className)} {...props} />;
}

export function DataTableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return <td className={cn('align-middle', className)} {...props} />;
}
