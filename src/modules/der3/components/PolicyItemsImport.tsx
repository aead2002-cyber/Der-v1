import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Upload, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { PolicyItem, Policy } from '@/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { policiesApi } from '@/modules/der3/services/policiesApi';
import { policyItemsApi } from '@/modules/der3/services/policyItemsApi';

interface Props {
  onDone?: () => void | Promise<void>;
}

const newId = () => Math.random().toString(36).slice(2, 11);
const todayStr = () => new Date().toISOString();

export function PolicyItemsImport({ onDone }: Props) {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ phase: string; current: number; total: number }>({ phase: '', current: 0, total: 0 });

  useEffect(() => {
    if (!busy) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; return ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [busy]);

  const downloadTemplate = async () => {
    let policies: Policy[] = [];
    let items: PolicyItem[] = [];
    try {
      [policies, items] = await Promise.all([
        policiesApi.getPolicies(),
        policyItemsApi.getPolicyItems(),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load template data');
      return;
    }

    const headers = [
      'nameAr', 'nameEn',
      'policyNameAr', 'policyNameEn',
      'parentItemNameAr', 'parentItemNameEn',
      'order',
      'descriptionAr', 'descriptionEn'
    ];
    const sample = [
      'مثال: التحقق متعدد العناصر', 'Example: Multi-Factor Authentication',
      policies[0]?.nameAr || '', policies[0]?.nameEn || '',
      '', '',
      1,
      '', ''
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
    ws['!cols'] = headers.map(() => ({ wch: 24 }));

    const refRows: any[][] = [['policyNameAr', 'policyNameEn']];
    policies.forEach(p => refRows.push([p.nameAr, p.nameEn]));
    refRows.push([]);
    refRows.push(['Existing items (optional parent reference):']);
    refRows.push(['policyNameEn (parent)', 'itemNameAr', 'itemNameEn']);
    items.forEach(it => {
      const pol = policies.find(p => p.id === it.policyId);
      refRows.push([pol?.nameEn || '', it.nameAr, it.nameEn]);
    });
    refRows.push([]);
    refRows.push(['Field rules:']);
    refRows.push(['nameAr / nameEn', 'at least one is required']);
    refRows.push(['policyNameAr or policyNameEn', 'must match an existing policy']);
    refRows.push(['parentItemName*', 'optional — must be an existing item under the same policy']);
    refRows.push(['order', 'optional integer, defaults to 0']);
    const refSheet = XLSX.utils.aoa_to_sheet(refRows);
    refSheet['!cols'] = [{ wch: 36 }, { wch: 36 }, { wch: 36 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PolicyItems');
    XLSX.utils.book_append_sheet(wb, refSheet, 'Reference');
    XLSX.writeFile(wb, `policy_items_template_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setProgress({ phase: isRtl ? 'قراءة الملف...' : 'Reading file...', current: 0, total: 0 });
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets['PolicyItems'] || wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });
      setProgress({ phase: isRtl ? 'التحقق من البيانات...' : 'Validating rows...', current: 0, total: rows.length });

      const [policies, existingItems]: [Policy[], PolicyItem[]] = await Promise.all([
        policiesApi.getPolicies(),
        policyItemsApi.getPolicyItems(),
      ]);

      const findPolicy = (ar: string, en: string) => {
        const a = String(ar || '').trim();
        const e = String(en || '').trim();
        return policies.find(p =>
          (a && p.nameAr?.trim() === a) ||
          (e && p.nameEn?.trim().toLowerCase() === e.toLowerCase())
        );
      };

      const findItem = (ar: string, en: string, policyId: string): PolicyItem | undefined => {
        const a = String(ar || '').trim();
        const e = String(en || '').trim();
        if (!a && !e) return undefined;
        return existingItems.find(it =>
          it.policyId === policyId &&
          ((a && it.nameAr?.trim() === a) || (e && it.nameEn?.trim().toLowerCase() === e.toLowerCase()))
        );
      };

      const errors: string[] = [];
      const newItems: PolicyItem[] = [];
      const now = todayStr();

      for (let i = 0; i < rows.length; i++) {
        if (i % 25 === 0) {
          setProgress(p => ({ ...p, current: i }));
          await new Promise(r => setTimeout(r, 0));
        }
        const r = rows[i];
        const lineNo = i + 2;
        const nameAr = String(r.nameAr || '').trim();
        const nameEn = String(r.nameEn || '').trim();
        if (!nameAr && !nameEn) continue;

        const policy = findPolicy(r.policyNameAr, r.policyNameEn);
        if (!policy) {
          errors.push(`#${lineNo}: ${isRtl ? 'لم يتم العثور على السياسة' : 'Policy not found'}`);
          continue;
        }

        const parent = findItem(r.parentItemNameAr, r.parentItemNameEn, policy.id);
        const order = Number(r.order) || 0;

        newItems.push({
          id: newId(),
          policyId: policy.id,
          parentId: parent?.id,
          order,
          nameAr: nameAr || nameEn,
          nameEn: nameEn || nameAr,
          descriptionAr: String(r.descriptionAr || ''),
          descriptionEn: String(r.descriptionEn || ''),
          attachments: [],
          createdAt: now,
          updatedAt: now
        } as PolicyItem);
      }

      if (newItems.length === 0) {
        toast.error(errors.length > 0
          ? (isRtl ? `فشل الاستيراد: ${errors[0]}` : `Import failed: ${errors[0]}`)
          : (isRtl ? 'لا توجد بيانات للاستيراد' : 'No data to import'));
        return;
      }

      setProgress({ phase: isRtl ? 'حفظ في الخادم...' : 'Saving to server...', current: newItems.length, total: newItems.length });
      await Promise.all(newItems.map(item => policyItemsApi.createPolicyItem(item)));
      const inserted = newItems.length;
      if (errors.length > 0) {
        toast.success(isRtl
          ? `تم استيراد ${inserted} بند (مع ${errors.length} صف تم تخطيه)`
          : `Imported ${inserted} items (${errors.length} skipped)`);
        console.warn('Skipped rows:', errors);
      } else {
        toast.success(isRtl ? `تم استيراد ${inserted} بند بنجاح` : `Imported ${inserted} items successfully`);
      }
      await onDone?.();
    } catch (err: any) {
      console.error(err);
      toast.error(isRtl ? `فشل قراءة الملف: ${err?.message || ''}` : `Could not read file: ${err?.message || ''}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) handleFile(f);
        }}
      />
      <Button type="button" variant="outline" onClick={downloadTemplate} className="rounded-lg border-border-subtle h-11 px-4 font-bold flex items-center gap-2">
        <Download className="w-4 h-4" />
        {isRtl ? 'نموذج Excel' : 'Template'}
      </Button>
      <Button type="button" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()} className="rounded-lg border-border-subtle h-11 px-4 font-bold flex items-center gap-2">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {isRtl ? 'استيراد Excel' : 'Import Excel'}
      </Button>

      {busy && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-[92%] text-center" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <h3 className="text-lg font-bold text-text-main mb-1">
              {isRtl ? 'جارٍ استيراد البنود' : 'Importing Policy Items'}
            </h3>
            <p className="text-[12px] text-text-muted mb-4">{progress.phase}</p>
            {progress.total > 0 && (
              <>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${Math.min(100, Math.round((progress.current / progress.total) * 100))}%` }} />
                </div>
                <p className="text-[11px] font-bold text-text-main">{progress.current} / {progress.total}</p>
              </>
            )}
            <p className="text-[11px] text-rose-600 mt-4 font-medium">
              {isRtl ? '⚠️ لا تغلق الصفحة حتى تنتهي العملية' : '⚠️ Please do not close this page until done'}
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
