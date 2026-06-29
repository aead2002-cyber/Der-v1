import React from 'react';
import { Pencil, Plus, RotateCcw, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LegalConfirmDialog } from '@/modules/legal/components/LegalConfirmDialog';
import { LegalDataTable } from '@/modules/legal/components/LegalDataTable';
import { LegalFormModal } from '@/modules/legal/components/LegalFormModal';
import { LegalPageHeader } from '@/modules/legal/components/LegalPageHeader';
import { LegalStatusBadge } from '@/modules/legal/components/LegalStatusBadge';
import { getLegalCases, getLegalParties, createLegalCase, updateLegalCase, deleteLegalCase, closeLegalCase, reopenLegalCase } from '@/modules/legal/services/legalApi';
import type { LegalCase, LegalCaseCategory, LegalCaseClosureReason, LegalCaseDirection, LegalParty } from '@/modules/legal/types/legal';
import { toast } from 'sonner';

const directionLabels: Record<LegalCaseDirection, string> = {
  AGAINST_US: 'علينا',
  BY_US: 'لصالحنا',
};

const categoryLabels: Record<LegalCaseCategory, string> = {
  LABOR: 'عمالية',
  COMMERCIAL: 'تجارية',
  CRIMINAL: 'جنائية',
  REAL_ESTATE: 'عقارية',
  ADMINISTRATIVE: 'إدارية',
  OTHER: 'أخرى',
};

const closureLabels: Record<LegalCaseClosureReason, string> = {
  RECONCILIATION: 'صلح',
  FINAL_JUDGMENT: 'حكم نهائي',
  WAIVER: 'تنازل',
  ARCHIVE: 'حفظ',
  OTHER: 'غير ذلك',
};

const emptyForm = {
  internalCaseNumber: '',
  officialCaseNumber: '',
  caseDate: '',
  direction: 'AGAINST_US' as LegalCaseDirection,
  category: 'COMMERCIAL' as LegalCaseCategory,
  courtName: '',
  plaintiffPartyId: '',
  defendantPartyId: '',
  subject: '',
  claimAmount: '',
  supervisorUserIds: '',
};

const CURRENT_USER_PLACEHOLDER = 'current-user';

export default function CasesPage() {
  const [cases, setCases] = React.useState<LegalCase[]>([]);
  const [parties, setParties] = React.useState<LegalParty[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LegalCase | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<LegalCase | null>(null);
  const [closeTarget, setCloseTarget] = React.useState<LegalCase | null>(null);
  const [reopenTarget, setReopenTarget] = React.useState<LegalCase | null>(null);
  const [closeReason, setCloseReason] = React.useState<LegalCaseClosureReason>('FINAL_JUDGMENT');
  const [closeAt, setCloseAt] = React.useState('');
  const [closeNotes, setCloseNotes] = React.useState('');
  const [reopenReason, setReopenReason] = React.useState('');

  const load = React.useCallback(() => {
    void getLegalCases().then(setCases);
    void getLegalParties().then(setParties);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const partyById = React.useMemo(() => new Map(parties.map(party => [party.id, party])), [parties]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (item: LegalCase) => {
    setEditing(item);
    setForm({
      internalCaseNumber: item.internalCaseNumber,
      officialCaseNumber: item.officialCaseNumber,
      caseDate: item.caseDate,
      direction: item.direction,
      category: item.category,
      courtName: item.courtName,
      plaintiffPartyId: item.plaintiffPartyId,
      defendantPartyId: item.defendantPartyId,
      subject: item.subject || '',
      claimAmount: item.claimAmount ? String(item.claimAmount) : '',
      supervisorUserIds: item.supervisorUserIds.join(', '),
    });
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.internalCaseNumber.trim() || !form.officialCaseNumber.trim() || !form.caseDate || !form.courtName.trim() || !form.plaintiffPartyId || !form.defendantPartyId) {
      toast.error('أكمل الحقول المطلوبة للقضية');
      return;
    }
    setSaving(true);
    const payload = {
      internalCaseNumber: form.internalCaseNumber.trim(),
      officialCaseNumber: form.officialCaseNumber.trim(),
      caseDate: form.caseDate,
      direction: form.direction,
      category: form.category,
      courtName: form.courtName.trim(),
      plaintiffPartyId: form.plaintiffPartyId,
      defendantPartyId: form.defendantPartyId,
      subject: form.subject.trim() || undefined,
      claimAmount: form.claimAmount ? Number(form.claimAmount) : undefined,
      supervisorUserIds: form.supervisorUserIds.split(',').map(item => item.trim()).filter(Boolean),
    };
    try {
      if (editing) {
        await updateLegalCase(editing.id, payload);
        toast.success('تم تحديث القضية بنجاح');
      } else {
        await createLegalCase(payload);
        toast.success('تمت إضافة القضية بنجاح');
      }
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteLegalCase(deleteTarget.id);
    toast.success('تم حذف القضية');
    setDeleteTarget(null);
    load();
  };

  const confirmClose = async () => {
    if (!closeTarget || !closeAt) return;
    await closeLegalCase(closeTarget.id, { closedAt: closeAt, closureReason: closeReason, closureNotes: closeNotes.trim() || undefined });
    toast.success('تم إغلاق القضية');
    setCloseTarget(null);
    setCloseAt('');
    setCloseNotes('');
    load();
  };

  const confirmReopen = async () => {
    if (!reopenTarget || !reopenReason.trim()) return;
    await reopenLegalCase(reopenTarget.id, { reopenReason: reopenReason.trim(), reopenedByUserId: CURRENT_USER_PLACEHOLDER });
    toast.success('تمت إعادة فتح القضية');
    setReopenTarget(null);
    setReopenReason('');
    load();
  };

  return (
    <div className="space-y-6">
      <LegalPageHeader
        title="القضايا"
        subtitle="سجل القضايا القانونية ومتابعتها بشكل موحد داخل النظام."
        actions={<Button className="rounded-2xl bg-slate-900 px-5 text-white hover:bg-slate-900" onClick={openCreate}><Plus className="ms-2 h-4 w-4" />إضافة قضية</Button>}
      />

      <LegalDataTable
        rows={cases}
        searchPlaceholder="بحث برقم القضية أو المحكمة أو الأطراف"
        columns={[
          { key: 'internalCaseNumber', label: 'رقم القضية الداخلي', sortable: true, render: item => item.internalCaseNumber, sortValue: item => item.internalCaseNumber, searchValue: item => item.internalCaseNumber },
          { key: 'officialCaseNumber', label: 'رقم القضية الرسمي', sortable: true, render: item => item.officialCaseNumber, sortValue: item => item.officialCaseNumber, searchValue: item => item.officialCaseNumber },
          { key: 'caseDate', label: 'تاريخ القضية', sortable: true, render: item => item.caseDate, sortValue: item => item.caseDate, searchValue: item => item.caseDate },
          { key: 'direction', label: 'الاتجاه', sortable: true, render: item => directionLabels[item.direction], sortValue: item => item.direction, searchValue: item => directionLabels[item.direction] },
          { key: 'category', label: 'التصنيف', sortable: true, render: item => categoryLabels[item.category], sortValue: item => item.category, searchValue: item => categoryLabels[item.category] },
          { key: 'court', label: 'المحكمة', sortable: true, render: item => item.courtName, sortValue: item => item.courtName, searchValue: item => item.courtName },
          { key: 'plaintiff', label: 'المدعي', render: item => partyById.get(item.plaintiffPartyId)?.name || item.plaintiffPartyId, searchValue: item => partyById.get(item.plaintiffPartyId)?.name || item.plaintiffPartyId },
          { key: 'defendant', label: 'المدعى عليه', render: item => partyById.get(item.defendantPartyId)?.name || item.defendantPartyId, searchValue: item => partyById.get(item.defendantPartyId)?.name || item.defendantPartyId },
          { key: 'status', label: 'الحالة', sortable: true, render: item => <LegalStatusBadge status={item.status === 'ACTIVE' ? 'قائمة' : 'مغلقة'} />, sortValue: item => item.status, searchValue: item => item.status },
          { key: 'supervisors', label: 'المشرفون', render: item => item.supervisorUserIds.join('، '), searchValue: item => item.supervisorUserIds.join(' ') },
          { key: 'actions', label: 'الإجراءات', render: item => <span className="text-xs text-slate-500">{item.status === 'CLOSED' ? 'مغلقة' : 'متاحة'}</span> },
        ]}
        rowActions={item => (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-2xl border-slate-200" onClick={() => openEdit(item)} disabled={item.status === 'CLOSED'} title={item.status === 'CLOSED' ? 'القضية مغلقة' : 'تعديل'}><Pencil className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setDeleteTarget(item)} disabled={item.status === 'CLOSED'} title={item.status === 'CLOSED' ? 'لا يمكن الحذف بعد الإغلاق' : 'حذف'}><Trash2 className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-2xl border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => { setCloseTarget(item); setCloseAt(new Date().toISOString().slice(0, 16)); }} disabled={item.status === 'CLOSED'} title="إغلاق"><XCircle className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-2xl border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => setReopenTarget(item)} disabled={item.status === 'ACTIVE'} title="إعادة فتح"><RotateCcw className="h-4 w-4" /></Button>
          </div>
        )}
      />

      <LegalFormModal open={open} title={editing ? 'تعديل قضية' : 'إضافة قضية'} onOpenChange={setOpen} onSubmit={submit} loading={saving}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>رقم القضية الداخلي</Label>
            <Input value={form.internalCaseNumber} onChange={event => setForm(prev => ({ ...prev, internalCaseNumber: event.target.value }))} className="h-11 rounded-2xl border-slate-200" />
          </div>
          <div className="space-y-2">
            <Label>رقم القضية الرسمي</Label>
            <Input value={form.officialCaseNumber} onChange={event => setForm(prev => ({ ...prev, officialCaseNumber: event.target.value }))} className="h-11 rounded-2xl border-slate-200" />
          </div>
          <div className="space-y-2">
            <Label>تاريخ القضية</Label>
            <Input type="date" value={form.caseDate} onChange={event => setForm(prev => ({ ...prev, caseDate: event.target.value }))} className="h-11 rounded-2xl border-slate-200" />
          </div>
          <div className="space-y-2">
            <Label>الاتجاه</Label>
            <Select value={form.direction} onValueChange={value => setForm(prev => ({ ...prev, direction: value as LegalCaseDirection }))}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AGAINST_US">علينا</SelectItem>
                <SelectItem value="BY_US">لصالحنا</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>التصنيف</Label>
            <Select value={form.category} onValueChange={value => setForm(prev => ({ ...prev, category: value as LegalCaseCategory }))}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(categoryLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>المحكمة</Label>
            <Input value={form.courtName} onChange={event => setForm(prev => ({ ...prev, courtName: event.target.value }))} className="h-11 rounded-2xl border-slate-200" />
          </div>
          <div className="space-y-2">
            <Label>المدعي</Label>
            <Select value={form.plaintiffPartyId} onValueChange={value => setForm(prev => ({ ...prev, plaintiffPartyId: value }))}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-200"><SelectValue placeholder="اختر الطرف" /></SelectTrigger>
              <SelectContent>{parties.map(party => <SelectItem key={party.id} value={party.id}>{party.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>المدعى عليه</Label>
            <Select value={form.defendantPartyId} onValueChange={value => setForm(prev => ({ ...prev, defendantPartyId: value }))}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-200"><SelectValue placeholder="اختر الطرف" /></SelectTrigger>
              <SelectContent>{parties.map(party => <SelectItem key={party.id} value={party.id}>{party.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>المبلغ المطالب به</Label>
            <Input type="number" value={form.claimAmount} onChange={event => setForm(prev => ({ ...prev, claimAmount: event.target.value }))} className="h-11 rounded-2xl border-slate-200" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>الموضوع</Label>
            <Textarea value={form.subject} onChange={event => setForm(prev => ({ ...prev, subject: event.target.value }))} className="min-h-24 rounded-2xl border-slate-200" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>المشرفون</Label>
            <Input value={form.supervisorUserIds} onChange={event => setForm(prev => ({ ...prev, supervisorUserIds: event.target.value }))} className="h-11 rounded-2xl border-slate-200" placeholder="u-1, u-2" />
            <p className="text-xs leading-6 text-slate-500">مؤقتاً: اكتب معرّفات المشرفين مفصولة بفاصلة.</p>
          </div>
        </div>
      </LegalFormModal>

      <LegalFormModal open={Boolean(closeTarget)} title="إغلاق القضية" onOpenChange={() => setCloseTarget(null)} onSubmit={event => { event.preventDefault(); void confirmClose(); }}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>تاريخ الإغلاق</Label>
            <Input type="datetime-local" value={closeAt} onChange={event => setCloseAt(event.target.value)} className="h-11 rounded-2xl border-slate-200" />
          </div>
          <div className="space-y-2">
            <Label>سبب الإغلاق</Label>
            <Select value={closeReason} onValueChange={value => setCloseReason(value as LegalCaseClosureReason)}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(closureLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>ملاحظات الإغلاق</Label>
            <Textarea value={closeNotes} onChange={event => setCloseNotes(event.target.value)} className="min-h-24 rounded-2xl border-slate-200" />
          </div>
        </div>
      </LegalFormModal>

      <LegalFormModal open={Boolean(reopenTarget)} title="إعادة فتح القضية" onOpenChange={() => setReopenTarget(null)} onSubmit={event => { event.preventDefault(); void confirmReopen(); }}>
        <div className="space-y-2">
          <Label>سبب إعادة الفتح</Label>
          <Textarea value={reopenReason} onChange={event => setReopenReason(event.target.value)} className="min-h-28 rounded-2xl border-slate-200" />
          <p className="text-xs leading-6 text-slate-500">سيتم استخدام معرّف المستخدم الحالي مؤقتاً إلى حين ربطه بالباك اند.</p>
        </div>
      </LegalFormModal>

      <LegalConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف القضية"
        description={`هل تريد حذف القضية ${deleteTarget?.internalCaseNumber || ''}؟`}
        confirmLabel="حذف"
        onConfirm={() => void confirmDelete()}
        onOpenChange={() => setDeleteTarget(null)}
      />
    </div>
  );
}
