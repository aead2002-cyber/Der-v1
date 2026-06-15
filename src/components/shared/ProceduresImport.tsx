import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Upload, Download, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { mockService, invalidateLocalCache, STORAGE_KEY_NAMES, apiUrl } from '@/services/mockService';
import { Procedure, Policy, Standard, User } from '@/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface Props {
  onDone?: () => void;
}

const STATUS_VALUES = new Set(['not_started', 'in_progress', 'completed']);
const IMPORTANCE_VALUES = new Set(['high', 'medium', 'low']);
const FREQUENCY_VALUES = new Set(['annual', 'semi_annual', 'quarterly', 'specific_date']);

const truthy = (v: any) => {
  if (v === true) return true;
  const s = String(v ?? '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'y', 'نعم'].includes(s);
};

const newId = () => Math.random().toString(36).slice(2, 11);
const today = () => new Date().toISOString().slice(0, 10);
const inOneYear = () => {
  const d = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
};

// Normalize a date cell value (may be Excel serial number or string)
const normDate = (v: any): string => {
  if (v == null || v === '') return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y.toString().padStart(4, '0')}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(v).trim();
  // Already ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // Try Date.parse
  const t = Date.parse(s);
  if (!isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return s;
};

export function ProceduresImport({ onDone }: Props) {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ phase: string; current: number; total: number }>({ phase: '', current: 0, total: 0 });

  // Prevent the user from leaving while an import is running
  useEffect(() => {
    if (!busy) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [busy]);

  const downloadTemplate = () => {
    const policies = mockService.getPolicies();
    const standards = mockService.getStandards();
    const users = mockService.getUsers();

    // Sheet 1: instructions + headers + sample row
    const headers = [
      'nameAr', 'nameEn',
      'policyNameAr', 'policyNameEn',
      'standardNameAr', 'standardNameEn',
      'status', 'importance',
      'endDate',
      'assignedToEmails',
      'isPeriodic', 'frequency',
      'descriptionAr', 'descriptionEn'
    ];
    const sampleRow = [
      'فحص الرسائل الواردة', 'Scan incoming messages',
      policies[0]?.nameAr || '', policies[0]?.nameEn || '',
      standards[0]?.nameAr || '', standards[0]?.nameEn || '',
      'not_started', 'medium',
      inOneYear(),
      '',
      'no', 'annual',
      '', ''
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    ws['!cols'] = headers.map(() => ({ wch: 22 }));

    // Reference sheet — lists valid policy + standard names so the user can pick
    const refRows: any[][] = [['policyNameAr', 'policyNameEn']];
    policies.forEach(p => refRows.push([p.nameAr, p.nameEn]));
    refRows.push([]);
    refRows.push(['standardNameAr', 'standardNameEn', 'policyNameEn (parent)']);
    standards.forEach(s => {
      const parent = policies.find(p => p.id === s.policyId);
      refRows.push([s.nameAr, s.nameEn, parent?.nameEn || '']);
    });
    refRows.push([]);
    refRows.push(['userEmail', 'userDisplayName']);
    users.forEach(u => refRows.push([u.email, u.displayName]));
    refRows.push([]);
    refRows.push(['Allowed values:']);
    refRows.push(['status', 'not_started | in_progress | completed']);
    refRows.push(['importance', 'high | medium | low']);
    refRows.push(['isPeriodic', 'yes | no']);
    refRows.push(['frequency', 'annual | semi_annual | quarterly | specific_date']);
    refRows.push(['assignedToEmails', 'comma-separated emails (must exist in Users)']);
    refRows.push(['startDate / endDate', 'YYYY-MM-DD']);
    const refSheet = XLSX.utils.aoa_to_sheet(refRows);
    refSheet['!cols'] = [{ wch: 40 }, { wch: 40 }, { wch: 40 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Procedures');
    XLSX.utils.book_append_sheet(wb, refSheet, 'Reference');
    XLSX.writeFile(wb, `procedures_template_${today()}.xlsx`);
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setProgress({ phase: isRtl ? 'قراءة الملف...' : 'Reading file...', current: 0, total: 0 });
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets['Procedures'] || wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });
      setProgress({ phase: isRtl ? 'التحقق من البيانات...' : 'Validating rows...', current: 0, total: rows.length });

      const policies: Policy[] = mockService.getPolicies();
      const standards: Standard[] = mockService.getStandards();
      const users: User[] = mockService.getUsers();

      const findPolicy = (ar: string, en: string): Policy | undefined => {
        const a = String(ar || '').trim();
        const e = String(en || '').trim();
        return policies.find(p =>
          (a && p.nameAr?.trim() === a) ||
          (e && p.nameEn?.trim().toLowerCase() === e.toLowerCase())
        );
      };
      const findStandard = (ar: string, en: string, policyId?: string): Standard | undefined => {
        const a = String(ar || '').trim();
        const e = String(en || '').trim();
        return standards.find(s =>
          (!policyId || s.policyId === policyId) &&
          ((a && s.nameAr?.trim() === a) || (e && s.nameEn?.trim().toLowerCase() === e.toLowerCase()))
        );
      };
      const findUserUid = (email: string): string | null => {
        const e = String(email || '').trim().toLowerCase();
        const u = users.find(x => (x.email || '').toLowerCase() === e);
        return u ? u.uid : null;
      };

      const errors: string[] = [];
      const now = new Date().toISOString();
      const newProcedures: Procedure[] = [];

      for (let i = 0; i < rows.length; i++) {
        if (i % 25 === 0) {
          setProgress(p => ({ ...p, current: i }));
          // Yield to the browser so the spinner can repaint
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
        const std = findStandard(r.standardNameAr, r.standardNameEn, policy.id);
        if (!std) {
          errors.push(`#${lineNo}: ${isRtl ? 'لم يتم العثور على المعيار' : 'Standard not found'}`);
          continue;
        }

        const status = STATUS_VALUES.has(String(r.status || '').trim()) ? String(r.status).trim() : 'not_started';
        const importance = IMPORTANCE_VALUES.has(String(r.importance || '').trim()) ? String(r.importance).trim() : 'medium';
        const endDate = normDate(r.endDate) || inOneYear();
        const startDate = endDate; // single-date model: startDate mirrors endDate
        const assignedTo: string[] = String(r.assignedToEmails || '')
          .split(',').map(s => s.trim()).filter(Boolean)
          .map(findUserUid).filter((x): x is string => !!x);
        const isPeriodic = truthy(r.isPeriodic);
        const frequency = FREQUENCY_VALUES.has(String(r.frequency || '').trim()) ? String(r.frequency).trim() : 'annual';

        newProcedures.push({
          id: newId(),
          policyId: policy.id,
          standardId: std.id,
          nameAr: nameAr || nameEn,
          nameEn: nameEn || nameAr,
          descriptionAr: String(r.descriptionAr || ''),
          descriptionEn: String(r.descriptionEn || ''),
          status: status as any,
          importance: importance as any,
          startDate,
          endDate,
          assignedTo,
          assignedTeams: [],
          isPeriodic,
          frequency: isPeriodic ? (frequency as any) : undefined,
          attachments: [],
          createdAt: now,
          updatedAt: now
        } as Procedure);
      }

      if (newProcedures.length === 0) {
        if (errors.length > 0) {
          console.warn('Import errors:', errors);
          toast.error(isRtl ? `فشل الاستيراد: ${errors[0]}` : `Import failed: ${errors[0]}`);
        } else {
          toast.error(isRtl ? 'لا توجد بيانات للاستيراد' : 'No data to import');
        }
        return;
      }

      // Single bulk POST: existing + all new — atomic, no per-row silent failures.
      setProgress({ phase: isRtl ? 'حفظ الإجراءات في الخادم...' : 'Saving to server...', current: newProcedures.length, total: newProcedures.length });
      const existing = mockService.getProcedures();
      // Normalize ISO datetime strings to YYYY-MM-DD so MSSQL DATE columns accept them
      const stripDate = (v: any): any => {
        if (typeof v !== 'string') return v;
        const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
        return m ? m[1] : v;
      };
      const cleaned = existing.map((p: any) => ({
        ...p,
        startDate: stripDate(p.startDate),
        endDate: stripDate(p.endDate)
      }));
      const payload = [...cleaned, ...newProcedures];

      const res = await fetch(`${apiUrl}/procedures/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || !data.success) {
        const msg = data.error || `HTTP ${res.status}`;
        toast.error(isRtl ? `فشل حفظ الدفعة: ${msg}` : `Bulk save failed: ${msg}`);
        console.error('Bulk save failed:', data);
        return;
      }

      // Bypass cache so the next read fetches the freshly-persisted payload
      invalidateLocalCache(STORAGE_KEY_NAMES.PROCEDURES);
      mockService.getProcedures();

      const inserted = newProcedures.length;
      if (errors.length > 0) {
        toast.success(isRtl
          ? `تم استيراد ${inserted} إجراء (مع ${errors.length} صف تم تخطيه)`
          : `Imported ${inserted} procedures (${errors.length} rows skipped)`);
        console.warn('Skipped rows:', errors);
      } else {
        toast.success(isRtl ? `تم استيراد ${inserted} إجراء بنجاح` : `Imported ${inserted} procedures successfully`);
      }
      onDone?.();
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
      <Button
        type="button"
        variant="outline"
        onClick={downloadTemplate}
        className="rounded-lg border-border-subtle h-11 px-4 font-bold flex items-center gap-2"
      >
        <Download className="w-4 h-4" />
        {isRtl ? 'نموذج Excel' : 'Template'}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="rounded-lg border-border-subtle h-11 px-4 font-bold flex items-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {isRtl ? 'استيراد Excel' : 'Import Excel'}
      </Button>

      {busy && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-[92%] text-center"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <h3 className="text-lg font-bold text-text-main mb-1">
              {isRtl ? 'جارٍ استيراد الإجراءات' : 'Importing Procedures'}
            </h3>
            <p className="text-[12px] text-text-muted mb-4">{progress.phase}</p>

            {progress.total > 0 && (
              <>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.round((progress.current / progress.total) * 100))}%` }}
                  />
                </div>
                <p className="text-[11px] font-bold text-text-main">
                  {progress.current} / {progress.total}
                </p>
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
