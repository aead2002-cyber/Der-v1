import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Edit2, Trash2, AlertCircle, AlertTriangle, Activity, Link2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { risksApi } from '@/modules/der3/services/risksApi';
import { proceduresApi } from '@/modules/der3/services/proceduresApi';
import { policiesApi } from '@/modules/der3/services/policiesApi';
import { policyItemsApi } from '@/modules/der3/services/policyItemsApi';
import { standardsApi } from '@/modules/der3/services/standardsApi';
import { Risk, Procedure, Policy, Standard, PolicyItem } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Pagination, usePagination } from '@/modules/der3/components/Pagination';
import { ConfirmDialog, PageHeader } from '@/shared/ui';

const empty: Partial<Risk> = {
  nameAr: '',
  nameEn: '',
  descriptionAr: '',
  descriptionEn: '',
  likelihood: 3,
  impact: 3,
  procedureIds: [],
};

const scoreColor = (score: number): string => {
  if (score >= 15) return 'bg-rose-100 text-rose-700 border-rose-200';
  if (score >= 9) return 'bg-amber-100 text-amber-700 border-amber-200';
  if (score >= 4) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
};

const scoreLabel = (score: number, isRtl: boolean): string => {
  if (score >= 15) return isRtl ? 'مرتفع جداً' : 'Very High';
  if (score >= 9) return isRtl ? 'مرتفع' : 'High';
  if (score >= 4) return isRtl ? 'متوسط' : 'Medium';
  return isRtl ? 'منخفض' : 'Low';
};

const getStandardItemIds = (standard: Standard | null | undefined): string[] => {
  if (!standard) return [];
  const itemIds = Array.isArray(standard.policyItemIds) ? standard.policyItemIds.filter(Boolean) : [];
  if (itemIds.length > 0) return itemIds;
  return standard.policyItemId ? [standard.policyItemId] : [];
};

const getRiskLikelihood = (risk: Risk, procedures: Procedure[]): number => {
  const procedureIds = risk.procedureIds || [];
  if (procedureIds.length === 0) return Math.max(1, Math.min(5, risk.likelihood || 1));

  const linked = procedures.filter(procedure => procedureIds.includes(procedure.id));
  if (linked.length === 0) return Math.max(1, Math.min(5, risk.likelihood || 1));

  const incomplete = linked.filter(procedure => procedure.status !== 'completed').length;
  if (incomplete === 0) return 1;
  if (incomplete === linked.length) return 5;

  return Math.max(1, Math.round((incomplete / linked.length) * 5));
};

export default function RisksPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [risks, setRisks] = useState<Risk[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [policyItems, setPolicyItems] = useState<PolicyItem[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);

  // Procedure-link filters inside the dialog
  const [procPolicyFilter, setProcPolicyFilter] = useState<string>('all');
  const [procItemFilter, setProcItemFilter] = useState<string>('all');
  const [procStandardFilter, setProcStandardFilter] = useState<string>('all');
  const [procSearch, setProcSearch] = useState('');
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<'all' | 'low' | 'medium' | 'high' | 'very_high'>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Risk>>(empty);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  const refresh = async () => {
    try {
      const [nextRisks, nextProcedures, nextPolicies, nextPolicyItems, nextStandards] = await Promise.all([
        risksApi.getRisks(),
        proceduresApi.getProcedures(),
        policiesApi.getPolicies(),
        policyItemsApi.getPolicyItems(),
        standardsApi.getStandards(),
      ]);
      setRisks(nextRisks);
      setProcedures(nextProcedures);
      setPolicies(nextPolicies);
      setPolicyItems(nextPolicyItems);
      setStandards(nextStandards);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isRtl ? 'تعذر تحميل المخاطر' : 'Failed to load risks'));
    }
  };

  // Reset filters whenever the dialog reopens
  useEffect(() => {
    if (dialogOpen) {
      setProcPolicyFilter('all');
      setProcItemFilter('all');
      setProcStandardFilter('all');
      setProcSearch('');
    }
  }, [dialogOpen]);

  const openNew = () => { setEditingId(null); setForm(empty); setDialogOpen(true); };
  const openEdit = (r: Risk) => {
    setEditingId(r.id);
    setForm({
      nameAr: r.nameAr,
      nameEn: r.nameEn,
      descriptionAr: r.descriptionAr || '',
      descriptionEn: r.descriptionEn || '',
      likelihood: r.likelihood ?? 3,
      impact: r.impact ?? 3,
      procedureIds: [...(r.procedureIds || [])],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nameAr || !form.nameEn) {
      toast.error(t('fill_required_fields'));
      return;
    }
    const existing = editingId ? risks.find(r => r.id === editingId) : null;
    const risk: Risk = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      nameAr: form.nameAr!,
      nameEn: form.nameEn!,
      descriptionAr: form.descriptionAr || '',
      descriptionEn: form.descriptionEn || '',
      likelihood: Math.max(1, Math.min(5, Number(form.likelihood) || 3)),
      impact: Math.max(1, Math.min(5, Number(form.impact) || 3)),
      procedureIds: form.procedureIds || [],
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
    if (editingId) {
      await risksApi.updateRisk(editingId, risk);
    } else {
      await risksApi.createRisk(risk);
    }
    toast.success(editingId ? (isRtl ? 'تم تحديث الخطر' : 'Risk updated') : (isRtl ? 'تمت إضافة الخطر' : 'Risk added'));
    setDialogOpen(false);
    await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isRtl ? 'تعذر حفظ الخطر' : 'Failed to save risk'));
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
    await risksApi.deleteRisk(deleteConfirmId);
    setDeleteConfirmId(null);
    toast.success(isRtl ? 'تم حذف الخطر' : 'Risk deleted');
    await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isRtl ? 'تعذر حذف الخطر' : 'Failed to delete risk'));
    }
  };

  const enrichedRisks = useMemo(() => {
    return risks.map(r => {
      const likelihood = getRiskLikelihood(r, procedures);
      const score = likelihood * (r.impact || 1);
      return { ...r, effectiveLikelihood: likelihood, score };
    }).sort((a, b) => b.score - a.score);
  }, [risks, procedures]);

  const filtered = useMemo(() => {
    return enrichedRisks.filter(r => {
      const matchesSearch = !search ||
        r.nameAr.includes(search) ||
        r.nameEn.toLowerCase().includes(search.toLowerCase());
      const lvl = r.score >= 15 ? 'very_high' : r.score >= 9 ? 'high' : r.score >= 4 ? 'medium' : 'low';
      const matchesLevel = filterLevel === 'all' || lvl === filterLevel;
      return matchesSearch && matchesLevel;
    });
  }, [enrichedRisks, search, filterLevel]);

  const { page, setPage, pageSize, setPageSize, paginate } = usePagination(filtered.length);
  const paged = paginate(filtered);

  const toggleProcLink = (procId: string) => {
    const list = form.procedureIds || [];
    setForm({
      ...form,
      procedureIds: list.includes(procId) ? list.filter(id => id !== procId) : [...list, procId],
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isRtl ? 'إدارة المخاطر' : 'Risk Management'}
        description={isRtl ? 'تسجيل وتقييم المخاطر وربطها بالإجراءات' : 'Register, assess, and link risks to procedures'}
        actions={
          <Button onClick={openNew} className="bg-primary hover:bg-primary/90 text-white font-bold px-6 h-11 rounded-lg shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4 mr-2" />
            {isRtl ? 'إضافة خطر' : 'Add Risk'}
          </Button>
        }
      />

      <div className="table-container">
        <div className="section-header">
          <div className="flex flex-col md:flex-row gap-4 w-full">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-10 rounded-lg border-border-subtle bg-slate-50/50 h-11"
                placeholder={t('search')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterLevel} onValueChange={v => setFilterLevel(v as any)}>
              <SelectTrigger className="w-full md:w-[200px] rounded-lg border-border-subtle h-11 bg-slate-50/50">
                <SelectValue>
                  {filterLevel === 'all' ? (isRtl ? 'كل المستويات' : 'All Levels')
                    : filterLevel === 'very_high' ? (isRtl ? 'مرتفع جداً' : 'Very High')
                    : filterLevel === 'high' ? (isRtl ? 'مرتفع' : 'High')
                    : filterLevel === 'medium' ? (isRtl ? 'متوسط' : 'Medium')
                    : (isRtl ? 'منخفض' : 'Low')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRtl ? 'كل المستويات' : 'All Levels'}</SelectItem>
                <SelectItem value="very_high">{isRtl ? 'مرتفع جداً (15+)' : 'Very High (15+)'}</SelectItem>
                <SelectItem value="high">{isRtl ? 'مرتفع (9-14)' : 'High (9-14)'}</SelectItem>
                <SelectItem value="medium">{isRtl ? 'متوسط (4-8)' : 'Medium (4-8)'}</SelectItem>
                <SelectItem value="low">{isRtl ? 'منخفض (1-3)' : 'Low (1-3)'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={isRtl ? 'text-right' : 'text-left'}>{isRtl ? 'اسم الخطر' : 'Risk Name'}</th>
                <th className="text-center w-[130px]">{isRtl ? 'نسبة الحدوث' : 'Likelihood'}</th>
                <th className="text-center w-[130px]">{isRtl ? 'الأثر' : 'Impact'}</th>
                <th className="text-center w-[140px]">{isRtl ? 'قيمة الخطر' : 'Risk Score'}</th>
                <th className="text-center w-[110px]">{isRtl ? 'إجراءات مرتبطة' : 'Linked'}</th>
                <th className={isRtl ? 'text-left w-[110px]' : 'text-right w-[110px]'}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-text-muted">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  {isRtl ? 'لا توجد مخاطر' : 'No risks yet'}
                </td></tr>
              ) : paged.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td>
                    <div className="font-bold text-text-main">{isRtl ? r.nameAr : r.nameEn}</div>
                    {(isRtl ? r.descriptionAr : r.descriptionEn) && (
                      <div className="text-[11px] text-text-muted line-clamp-1 mt-0.5">{isRtl ? r.descriptionAr : r.descriptionEn}</div>
                    )}
                  </td>
                  <td className="text-center">
                    <span className="inline-flex items-center justify-center min-w-[32px] h-7 px-2 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-[12px]">
                      {r.effectiveLikelihood}
                    </span>
                    {(r.procedureIds?.length || 0) > 0 && (
                      <div className="text-[10px] text-text-muted mt-0.5">{isRtl ? 'محسوبة' : 'auto'}</div>
                    )}
                  </td>
                  <td className="text-center">
                    <span className="inline-flex items-center justify-center min-w-[32px] h-7 px-2 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-[12px]">
                      {r.impact}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={cn('inline-flex items-center justify-center min-w-[80px] h-8 px-3 rounded-md font-mono font-bold text-[13px] border', scoreColor(r.score))}>
                      {r.score}
                      <span className="text-[10px] ml-1.5 opacity-80">{scoreLabel(r.score, isRtl)}</span>
                    </span>
                  </td>
                  <td className="text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold">
                      <Activity className="w-3 h-3" />
                      {r.procedureIds?.length || 0}
                    </span>
                  </td>
                  <td>
                    <div className={cn('flex gap-1', isRtl ? 'justify-start' : 'justify-end')}>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)} className="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-50">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(r.id)} className="w-8 h-8 rounded-lg text-rose-600 hover:bg-rose-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto rounded-xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingId ? (isRtl ? 'تعديل خطر' : 'Edit Risk') : (isRtl ? 'إضافة خطر' : 'Add Risk')}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-text-main">{t('name_ar')} <span className="text-red-500">*</span></label>
              <Input value={form.nameAr || ''} onChange={e => setForm({ ...form, nameAr: e.target.value })} className="h-10 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-text-main">{t('name_en')} <span className="text-red-500">*</span></label>
              <Input value={form.nameEn || ''} onChange={e => setForm({ ...form, nameEn: e.target.value })} dir="ltr" className="h-10 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-text-main">{t('description_ar')}</label>
              <textarea value={form.descriptionAr || ''} onChange={e => setForm({ ...form, descriptionAr: e.target.value })} className="w-full min-h-[80px] rounded-lg border border-border-subtle p-2.5 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-text-main">{t('description_en')}</label>
              <textarea value={form.descriptionEn || ''} onChange={e => setForm({ ...form, descriptionEn: e.target.value })} dir="ltr" className="w-full min-h-[80px] rounded-lg border border-border-subtle p-2.5 text-sm" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-text-main">{isRtl ? 'نسبة الحدوث (1-5)' : 'Likelihood (1-5)'}</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm({ ...form, likelihood: n })}
                    className={cn('flex-1 h-10 rounded-lg border-2 font-mono font-bold transition-all',
                      form.likelihood === n ? 'border-primary bg-primary/10 text-primary' : 'border-border-subtle hover:border-primary/50')}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {(form.procedureIds?.length || 0) > 0 && (
                <p className="text-[11px] text-amber-700 mt-1">{isRtl ? '⚠️ يُحسب تلقائياً من حالة الإجراءات المرتبطة' : '⚠️ Auto-recomputed from linked procedures'}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-text-main">{isRtl ? 'الأثر (1-5)' : 'Impact (1-5)'}</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm({ ...form, impact: n })}
                    className={cn('flex-1 h-10 rounded-lg border-2 font-mono font-bold transition-all',
                      form.impact === n ? 'border-primary bg-primary/10 text-primary' : 'border-border-subtle hover:border-primary/50')}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 bg-slate-50 rounded-lg p-3 flex items-center justify-between border border-border-subtle">
              <span className="text-sm font-bold text-text-main">{isRtl ? 'قيمة الخطر' : 'Risk Score'}</span>
              {(() => {
                const eff = form.procedureIds && form.procedureIds.length > 0
                  ? (() => {
                      const linked = procedures.filter(p => form.procedureIds!.includes(p.id));
                      if (linked.length === 0) return form.likelihood || 1;
                      const inc = linked.filter(p => p.status !== 'completed').length;
                      if (inc === 0) return 1;
                      if (inc === linked.length) return 5;
                      return Math.max(1, Math.round((inc / linked.length) * 5));
                    })()
                  : (form.likelihood || 1);
                const score = eff * (form.impact || 1);
                return (
                  <span className={cn('inline-flex items-center justify-center px-4 h-9 rounded-md font-mono font-bold text-base border', scoreColor(score))}>
                    {score} <span className="text-[11px] ml-2 opacity-80">{scoreLabel(score, isRtl)}</span>
                  </span>
                );
              })()}
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[12px] font-bold text-text-main flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-violet-600" />
                {isRtl ? 'ربط بالإجراءات' : 'Link to Procedures'}
              </label>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder={t('search')}
                    value={procSearch}
                    onChange={e => setProcSearch(e.target.value)}
                    className="pl-8 h-9 text-[12px] rounded-md border-border-subtle bg-slate-50/50"
                  />
                </div>
                <Select value={procPolicyFilter} onValueChange={(v) => { setProcPolicyFilter(v); setProcItemFilter('all'); setProcStandardFilter('all'); }}>
                  <SelectTrigger className="h-9 text-[12px] rounded-md border-border-subtle bg-slate-50/50">
                    <SelectValue>
                      {procPolicyFilter === 'all' ? (isRtl ? 'كل السياسات' : 'All Policies')
                        : (policies.find(p => p.id === procPolicyFilter)?.[isRtl ? 'nameAr' : 'nameEn'] || (isRtl ? 'سياسة' : 'Policy'))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRtl ? 'كل السياسات' : 'All Policies'}</SelectItem>
                    {policies.map(p => (
                      <SelectItem key={p.id} value={p.id}>{isRtl ? p.nameAr : p.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={procItemFilter}
                  onValueChange={(v) => { setProcItemFilter(v); setProcStandardFilter('all'); }}
                  disabled={procPolicyFilter === 'all'}
                >
                  <SelectTrigger className="h-9 text-[12px] rounded-md border-border-subtle bg-slate-50/50 disabled:opacity-50">
                    <SelectValue>
                      {procItemFilter === 'all' ? (isRtl ? 'كل البنود' : 'All Items')
                        : (policyItems.find(i => i.id === procItemFilter)?.[isRtl ? 'nameAr' : 'nameEn'] || (isRtl ? 'بند' : 'Item'))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRtl ? 'كل البنود' : 'All Items'}</SelectItem>
                    {policyItems.filter(i => i.policyId === procPolicyFilter).map(i => (
                      <SelectItem key={i.id} value={i.id}>{isRtl ? i.nameAr : i.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={procStandardFilter}
                  onValueChange={setProcStandardFilter}
                  disabled={procPolicyFilter === 'all'}
                >
                  <SelectTrigger className="h-9 text-[12px] rounded-md border-border-subtle bg-slate-50/50 disabled:opacity-50">
                    <SelectValue>
                      {procStandardFilter === 'all' ? (isRtl ? 'كل المعايير' : 'All Standards')
                        : (standards.find(s => s.id === procStandardFilter)?.[isRtl ? 'nameAr' : 'nameEn'] || (isRtl ? 'معيار' : 'Standard'))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRtl ? 'كل المعايير' : 'All Standards'}</SelectItem>
                    {standards
                      .filter(s => s.policyId === procPolicyFilter)
                      .filter(s => procItemFilter === 'all' || getStandardItemIds(s).includes(procItemFilter))
                      .map(s => (
                        <SelectItem key={s.id} value={s.id}>{isRtl ? s.nameAr : s.nameEn}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {(() => {
                const filteredProcs = procedures.filter(p => {
                  if (procPolicyFilter !== 'all' && p.policyId !== procPolicyFilter) return false;
                  if (procStandardFilter !== 'all' && p.standardId !== procStandardFilter) return false;
                  if (procItemFilter !== 'all') {
                    const std = standards.find(s => s.id === p.standardId);
                    if (!std || !getStandardItemIds(std).includes(procItemFilter)) return false;
                  }
                  if (procSearch) {
                    const q = procSearch.toLowerCase();
                    if (!(p.nameAr.includes(procSearch) || p.nameEn.toLowerCase().includes(q))) return false;
                  }
                  return true;
                });
                return (
                  <>
                    <div className="text-[11px] text-text-muted mb-1">
                      {isRtl ? `إجمالي: ${filteredProcs.length}` : `Total: ${filteredProcs.length}`}
                      {(form.procedureIds?.length || 0) > 0 && (
                        <span className="text-violet-700 font-bold"> • {form.procedureIds!.length} {isRtl ? 'محدد' : 'selected'}</span>
                      )}
                    </div>
                    <div className="border border-border-subtle rounded-lg p-2 max-h-[260px] overflow-y-auto space-y-1">
                      {filteredProcs.length === 0 ? (
                        <p className="text-[12px] text-text-muted text-center py-4 italic">{isRtl ? 'لا توجد إجراءات مطابقة' : 'No matching procedures'}</p>
                      ) : filteredProcs.map(p => {
                        const checked = (form.procedureIds || []).includes(p.id);
                        const std = standards.find(s => s.id === p.standardId);
                        const pol = policies.find(po => po.id === p.policyId);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleProcLink(p.id)}
                            className={cn('w-full flex items-center justify-between p-2 rounded-md text-start transition-colors',
                              checked ? 'bg-violet-50 border border-violet-200' : 'hover:bg-slate-50 border border-transparent')}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="text-[13px] font-bold text-text-main truncate">{isRtl ? p.nameAr : p.nameEn}</span>
                              <span className="text-[10px] text-text-muted truncate">
                                {pol && (isRtl ? pol.nameAr : pol.nameEn)}
                                {std && <> • {isRtl ? std.nameAr : std.nameEn}</>}
                                {' • '}{t(p.status)}
                              </span>
                            </div>
                            <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0',
                              checked ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-300')}>
                              {checked && <Check className="w-3 h-3" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border-subtle">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-lg h-10 px-5 font-bold">{t('cancel')}</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white rounded-lg h-10 px-6 font-bold">{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(v) => { if (!v) setDeleteConfirmId(null); }}
        title={t('confirm_delete') || 'Confirm Delete'}
        description={isRtl ? 'هل أنت متأكد من حذف هذا الخطر؟' : 'Delete this risk?'}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        onConfirm={handleDelete}
      />
    </div>
  );
}
