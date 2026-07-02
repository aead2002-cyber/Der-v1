import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  total,
  page,
  pageSize,
  pageSizeOptions = [10, 20],
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  const Prev = isRtl ? ChevronRight : ChevronLeft;
  const Next = isRtl ? ChevronLeft : ChevronRight;
  const First = isRtl ? ChevronsRight : ChevronsLeft;
  const Last = isRtl ? ChevronsLeft : ChevronsRight;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 border-t border-border-subtle">
      <div className="flex items-center gap-3 text-[12px] text-text-muted font-medium">
        <span>
          {isRtl
            ? `إجمالي ${total.toLocaleString('ar-EG')} صف`
            : `Total ${total.toLocaleString('en-US')} rows`}
        </span>
        {total > 0 && (
          <span className="text-text-muted/60">
            {isRtl
              ? `(${from.toLocaleString('ar-EG')}-${to.toLocaleString('ar-EG')})`
              : `(${from}-${to})`}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-text-muted font-medium">
            {isRtl ? 'لكل صفحة' : 'Per page'}
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-9 w-[80px] rounded-lg border-border-subtle bg-slate-50/50 text-[12px] font-bold">
              <SelectValue>{pageSize}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            disabled={safePage <= 1}
            onClick={() => onPageChange(1)}
            title={isRtl ? 'الأولى' : 'First'}
          >
            <First className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            title={isRtl ? 'السابقة' : 'Previous'}
          >
            <Prev className="w-4 h-4" />
          </Button>
          <span className={cn('text-[12px] font-bold text-text-main px-2 min-w-[80px] text-center')}>
            {isRtl
              ? `صفحة ${safePage.toLocaleString('ar-EG')} من ${totalPages.toLocaleString('ar-EG')}`
              : `Page ${safePage} of ${totalPages}`}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
            title={isRtl ? 'التالية' : 'Next'}
          >
            <Next className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            title={isRtl ? 'الأخيرة' : 'Last'}
          >
            <Last className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function usePagination(total: number, initialSize = 10) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialSize);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginate = <T,>(rows: T[]): T[] => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return { page, setPage, pageSize, setPageSize: handlePageSizeChange, paginate };
}
