import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface LegalTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  searchValue?: (row: T) => string;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

interface LegalDataTableProps<T> {
  rows: T[];
  columns: LegalTableColumn<T>[];
  emptyMessage?: string;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  rowActions?: (row: T) => React.ReactNode;
}

type SortDirection = 'asc' | 'desc';

export function LegalDataTable<T>({
  rows,
  columns,
  emptyMessage = 'لا توجد بيانات حالياً',
  searchPlaceholder = 'بحث',
  filters,
  defaultPageSize = 20,
  pageSizeOptions = [20, 50],
  rowActions,
}: LegalDataTableProps<T>) {
  const [search, setSearch] = React.useState('');
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(defaultPageSize);

  React.useEffect(() => {
    setPage(1);
  }, [search, rows, pageSize, filters]);

  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(row =>
      columns.some(column => {
        const raw = column.searchValue?.(row);
        if (!raw) return false;
        return raw.toLowerCase().includes(query);
      })
    );
  }, [rows, columns, search]);

  const sortedRows = React.useMemo(() => {
    if (!sortKey) return filteredRows;
    const column = columns.find(item => item.key === sortKey);
    if (!column?.sortValue) return filteredRows;
    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      const left = column.sortValue?.(a);
      const right = column.sortValue?.(b);
      if (left === right) return 0;
      if (left === undefined || left === null) return 1 * direction;
      if (right === undefined || right === null) return -1 * direction;
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction;
      return String(left).localeCompare(String(right), 'ar') * direction;
    });
  }, [columns, filteredRows, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const hasRows = pageRows.length > 0;

  const toggleSort = (column: LegalTableColumn<T>) => {
    if (!column.sortable) return;
    setPage(1);
    setSortKey(current => {
      if (current !== column.key) {
        setSortDirection('asc');
        return column.key;
      }
      setSortDirection(direction => (direction === 'asc' ? 'desc' : 'asc'));
      return current;
    });
  };

  const Prev = ChevronLeft;
  const Next = ChevronRight;
  const First = ChevronsLeft;
  const Last = ChevronsRight;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-border-subtle bg-card p-4 shadow-[var(--der3-shadow-card)] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-11 rounded-2xl border-border-subtle bg-background pe-10"
            />
          </div>
          {filters ? <div className="flex flex-wrap gap-2">{filters}</div> : null}
        </div>
        <div className="text-sm font-semibold text-text-muted">
          {sortedRows.length === 0 ? '0' : `${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, sortedRows.length)}`} / {sortedRows.length}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border-subtle bg-card shadow-[var(--der3-shadow-card)]">
        <Table>
          <TableHeader className="bg-background">
            <TableRow className="hover:bg-transparent">
              {columns.map(column => {
                const active = sortKey === column.key;
                const Icon = active ? (sortDirection === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <TableHead key={column.key} className={cn('h-14 whitespace-nowrap px-4 text-right font-bold text-text-muted', column.className, column.align === 'center' && 'text-center', column.align === 'left' && 'text-left')}>
                    <button
                      type="button"
                      className={cn('inline-flex items-center gap-2', column.sortable && 'cursor-pointer hover:text-text-main')}
                      onClick={() => toggleSort(column)}
                    >
                      <span>{column.label}</span>
                      {column.sortable ? <Icon className="h-3.5 w-3.5" /> : null}
                    </button>
                  </TableHead>
                );
              })}
              {rowActions ? <TableHead className="w-40 px-4 text-right font-bold text-text-muted">الإجراءات</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasRows ? (
              pageRows.map((row, index) => (
                <TableRow key={index} className="hover:bg-background/70">
                  {columns.map(column => (
                    <TableCell key={column.key} className={cn('px-4 py-4 align-top text-text-main', column.className, column.align === 'center' && 'text-center', column.align === 'left' && 'text-left')}>
                      {column.render(row)}
                    </TableCell>
                  ))}
                  {rowActions ? <TableCell className="px-4 py-4 align-top">{rowActions(row)}</TableCell> : null}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + (rowActions ? 1 : 0)} className="px-6 py-10 text-center text-text-muted">
                  <div className="rounded-2xl border border-dashed border-border-subtle bg-background p-8">
                    <p className="text-base font-bold text-text-main">{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-3 border-t border-border-subtle px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <span>عدد الصفوف</span>
            <Select value={String(pageSize)} onValueChange={value => { setPageSize(Number(value)); setPage(1); }}>
              <SelectTrigger className="h-10 w-24 rounded-2xl border-border-subtle bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map(option => (
                  <SelectItem key={option} value={String(option)}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border-subtle" disabled={safePage <= 1} onClick={() => setPage(1)}>
              <First className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border-subtle" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
              <Prev className="h-4 w-4" />
            </Button>
            <div className="min-w-28 text-center text-sm font-bold text-text-main">
              {safePage} / {totalPages}
            </div>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border-subtle" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
              <Next className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-border-subtle" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)}>
              <Last className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
