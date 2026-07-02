import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

export interface ExportColumn<T = any> {
  header: string;
  accessor: (row: T) => any;
}

interface Props<T> {
  title: string;
  rows: T[];
  columns: ExportColumn<T>[];
  filename?: string;
  className?: string;
}

const escapeHtml = (s: any): string => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function ExportMenu<T>({ title, rows, columns, filename, className }: Props<T>) {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const stamp = new Date().toISOString().slice(0, 10);
  const baseName = (filename || title || 'export').replace(/\s+/g, '_');

  const exportPdf = () => {
    setOpen(false);
    const dir = isRtl ? 'rtl' : 'ltr';
    const lang = isRtl ? 'ar' : 'en';
    const headRow = columns.map(c => `<th>${escapeHtml(c.header)}</th>`).join('');
    const bodyRows = rows.length === 0
      ? `<tr><td class="muted" colspan="${columns.length}">${isRtl ? 'لا توجد بيانات' : 'No data'}</td></tr>`
      : rows.map(r => `<tr>${columns.map(c => `<td>${escapeHtml(c.accessor(r))}</td>`).join('')}</tr>`).join('');

    const html = `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
@page { size: A4 landscape; margin: 14mm; }
body { font-family: "Segoe UI","Tahoma",sans-serif; color: #0f172a; padding: 20px; direction: ${dir}; }
.header { display:flex; align-items:baseline; justify-content:space-between; padding-bottom:12px; border-bottom:2px solid #1f3a5f; margin-bottom:14px }
.header h1 { margin:0; font-size:20px; color:#1f3a5f }
.header .meta { font-size:11px; color:#64748b }
table { width:100%; border-collapse:collapse; font-size:12px }
th { background:#1f3a5f; color:#fff; text-align:${isRtl ? 'right' : 'left'}; padding:8px 10px; font-weight:700 }
td { padding:7px 10px; border-bottom:1px solid #e2e8f0; text-align:${isRtl ? 'right' : 'left'}; vertical-align:top }
tr:nth-child(even) td { background:#f8fafc }
.muted { color:#94a3b8; text-align:center; font-style:italic }
.footer { margin-top:20px; font-size:10px; color:#94a3b8; text-align:center; border-top:1px solid #e2e8f0; padding-top:8px }
</style></head>
<body>
  <div class="header">
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">${isRtl ? 'تاريخ التوليد' : 'Generated'}: ${new Date().toLocaleString(isRtl ? 'ar-SA' : 'en-US')}</div>
  </div>
  <table>
    <thead><tr>${headRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <div class="footer">DER3 Shield System</div>
</body></html>`;

    const win = window.open('', '_blank', 'width=1024,height=768');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { try { win.print(); } catch { /* noop */ } }, 400);
  };

  const exportExcel = () => {
    setOpen(false);
    const aoa: any[][] = [columns.map(c => c.header)];
    for (const r of rows) aoa.push(columns.map(c => c.accessor(r)));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 28) || 'Data');
    XLSX.writeFile(wb, `${baseName}_${stamp}.xlsx`);
  };

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-white border border-border-subtle text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
      >
        <Download className="w-4 h-4" />
        {isRtl ? 'تصدير' : 'Export'}
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className={cn('absolute z-30 mt-1 w-44 bg-white border border-border-subtle rounded-lg shadow-lg overflow-hidden', isRtl ? 'right-0' : 'left-0')}>
          <button
            type="button"
            onClick={exportPdf}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50 text-start"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            {isRtl ? 'تصدير PDF' : 'Export PDF'}
          </button>
          <button
            type="button"
            onClick={exportExcel}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-50 text-start border-t border-border-subtle"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            {isRtl ? 'تصدير Excel' : 'Export Excel'}
          </button>
        </div>
      )}
    </div>
  );
}
