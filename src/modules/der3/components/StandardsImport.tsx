import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Upload, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Standard, Policy, PolicyItem, StandardClassification } from '@/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { policiesApi } from '@/modules/der3/services/policiesApi';
import { policyItemsApi } from '@/modules/der3/services/policyItemsApi';
import { standardsApi } from '@/modules/der3/services/standardsApi';
import { standardClassificationsApi } from '@/modules/der3/services/standardClassificationsApi';

interface Props {
  onDone?: () => void | Promise<void>;
}

const newId = () => Math.random().toString(36).slice(2, 11);
const todayStr = () => new Date().toISOString();

export function StandardsImport({ onDone }: Props) {
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
    let classifications: StandardClassification[] = [];
    try {
      [policies, items, classifications] = await Promise.all([
        policiesApi.getPolicies(),
        policyItemsApi.getPolicyItems(),
        standardClassificationsApi.getStandardClassifications(),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load template data');
      return;
    }

    const headers = [
      'nameAr', 'nameEn',
      'policyNameAr', 'policyNameEn',
      'linkedItemsEn',
      'classificationsEn',
      'objectiveAr', 'objectiveEn',
      'potentialRisksAr', 'potentialRisksEn'
    ];
    const sample = [
      'مثال: تصفية المحتوى', 'Example: Content Filtering',
      policies[0]?.nameAr || '', policies[0]?.nameEn || '',
      '', '',
      '', '',
      '', ''
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
    ws['!cols'] = headers.map(() => ({ wch: 28 }));

    const refRows: any[][] = [['policyNameAr', 'policyNameEn']];
    policies.forEach(p => refRows.push([p.nameAr, p.nameEn]));
    refRows.push([]);
    refRows.push(['Items reference (use names in linkedItemsEn, comma-separated):']);
    refRows.push(['policyNameEn (parent)', 'itemNameAr', 'itemNameEn']);
    items.forEach(it => {
      const pol = policies.find(p => p.id === it.policyId);
      refRows.push([pol?.nameEn || '', it.nameAr, it.nameEn]);
    });
    refRows.push([]);
    refRows.push(['Classifications (use names in classificationsEn, comma-separated):']);
    refRows.push(['nameAr', 'nameEn']);
    classifications.forEach(c => refRows.push([c.nameAr, c.nameEn]));
    refRows.push([]);
    refRows.push(['Field rules:']);
    refRows.push(['nameAr / nameEn', 'at least one is required']);
    refRows.push(['policyNameAr or policyNameEn', 'must match an existing policy']);
    refRows.push(['linkedItemsEn', 'optional, comma-separated names of items under same policy']);
    refRows.push(['classificationsEn', 'optional, comma-separated classification names']);
    const refSheet = XLSX.utils.aoa_to_sheet(refRows);
    refSheet['!cols'] = [{ wch: 36 }, { wch: 36 }, { wch: 36 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Standards');
    XLSX.utils.book_append_sheet(wb, refSheet, 'Reference');
    XLSX.writeFile(wb, `standards_template_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setProgress({ phase: isRtl ? 'قراءة الملف...' : 'Reading file...', current: 0, total: 0 });
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets['Standards'] || wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });
      setProgress({ phase: isRtl ? 'التحقق من البيانات...' : 'Validating rows...', current: 0, total: rows.length });

      const [policies, items, classifications]: [Policy[], PolicyItem[], StandardClassification[]] = await Promise.all([
        policiesApi.getPolicies(),
        policyItemsApi.getPolicyItems(),
        standardClassificationsApi.getStandardClassifications(),
      ]);

      const findPolicy = (ar: string, en: string) => {
        const a = String(ar || '').trim();
        const e = String(en || '').trim();
        return policies.find(p =>
          (a && p.nameAr?.trim() === a) ||
          (e && p.nameEn?.trim().toLowerCase() === e.toLowerCase())
        );
      };

      const matchItemId = (name: string, policyId: string): string | null => {
        const n = name.trim();
        if (!n) return null;
        const it = items.find(x =>
          x.policyId === policyId &&
          (x.nameAr?.trim() === n || x.nameEn?.trim().toLowerCase() === n.toLowerCase())
        );
        return it?.id || null;
      };

      const matchClassId = (name: string): string | null => {
        const n = name.trim();
        if (!n) return null;
        const c = classifications.find(x =>
          x.nameAr?.trim() === n || x.nameEn?.trim().toLowerCase() === n.toLowerCase()
        );
        return c?.id || null;
      };

      const errors: string[] = [];
      const newStandards: Standard[] = [];
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

        const itemNames = String(r.linkedItemsEn || '').split(',').map(s => s.trim()).filter(Boolean);
        const policyItemIds = itemNames.map(n => matchItemId(n, policy.id)).filter((x): x is string => !!x);

        const classNames = String(r.classificationsEn || '').split(',').map(s => s.trim()).filter(Boolean);
        const classIds = classNames.map(matchClassId).filter((x): x is string => !!x);

        newStandards.push({
          id: newId(),
          policyId: policy.id,
          policyItemIds,
          nameAr: nameAr || nameEn,
          nameEn: nameEn || nameAr,
          descriptionAr: String(r.objectiveAr || ''),
          descriptionEn: String(r.objectiveEn || ''),
          potentialRisksAr: String(r.potentialRisksAr || ''),
          potentialRisksEn: String(r.potentialRisksEn || ''),
          classifications: classIds,
          attachments: [],
          createdAt: now,
          updatedAt: now
        } as Standard);
      }

      if (newStandards.length === 0) {
        toast.error(errors.length > 0
          ? (isRtl ? `فشل الاستيراد: ${errors[0]}` : `Import failed: ${errors[0]}`)
          : (isRtl ? 'لا توجد بيانات للاستيراد' : 'No data to import'));
        return;
      }

      setProgress({ phase: isRtl ? 'حفظ في الخادم...' : 'Saving to server...', current: newStandards.length, total: newStandards.length });
      await Promise.all(newStandards.map(standard => standardsApi.createStandard(standard)));
      const inserted = newStandards.length;
      if (errors.length > 0) {
        toast.success(isRtl
          ? `تم استيراد ${inserted} معيار (مع ${errors.length} صف تم تخطيه)`
          : `Imported ${inserted} standards (${errors.length} skipped)`);
        console.warn('Skipped rows:', errors);
      } else {
        toast.success(isRtl ? `تم استيراد ${inserted} معيار بنجاح` : `Imported ${inserted} standards successfully`);
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
              {isRtl ? 'جارٍ استيراد المعايير' : 'Importing Standards'}
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
