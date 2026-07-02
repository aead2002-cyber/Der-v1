import React from 'react';
import { Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LegalConfirmDialog } from '@/modules/legal/components/LegalConfirmDialog';
import { LegalDataTable } from '@/modules/legal/components/LegalDataTable';
import { LegalFormModal } from '@/modules/legal/components/LegalFormModal';
import { LegalMultiSelectField } from '@/modules/legal/components/LegalMultiSelectField';
import { LegalPageHeader } from '@/modules/legal/components/LegalPageHeader';
import { getLegalEmployees, getLegalInvestigations, createLegalInvestigation, updateLegalInvestigation, deleteLegalInvestigation, closeLegalInvestigation } from '@/modules/legal/services/legalApi';
import type { LegalEmployee, LegalInvestigation, LegalInvestigationResult, LegalInvestigationStatus } from '@/modules/legal/types/legal';
import { toast } from 'sonner';

const resultLabels: Record<LegalInvestigationResult, string> = {
  PROVEN: 'مثبت',
  NOT_PROVEN: 'غير مثبت',
  ARCHIVED: 'حفظ',
  REFERRED: 'إحالة',
  OTHER: 'أخرى',
};

const emptyForm = {
  investigationNumber: '',
  investigationDate: '',
  subject: '',
  employeeIds: [] as string[],
};

export default function InvestigationsPage() {
  const [investigations, setInvestigations] = React.useState<LegalInvestigation[]>([]);
  const [employees, setEmployees] = React.useState<LegalEmployee[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LegalInvestigation | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<LegalInvestigation | null>(null);
  const [closeTarget, setCloseTarget] = React.useState<LegalInvestigation | null>(null);
  const [closeAt, setCloseAt] = React.useState('');
  const [closeResult, setCloseResult] = React.useState<LegalInvestigationResult>('NOT_PROVEN');
  const [finalDecision, setFinalDecision] = React.useState('');
  const [finalRecommendations, setFinalRecommendations] = React.useState('');
  const [closureNotes, setClosureNotes] = React.useState('');

  const load = React.useCallback(() => {
    void Promise.all([getLegalInvestigations(), getLegalEmployees()]).then(([investigationRows, employeeRows]) => {
      setInvestigations(investigationRows);
      setEmployees(employeeRows);
    });
  }, []);

  React.useEffect(() => { load(); }, [load]);
  const employeeById = React.useMemo(() => new Map(employees.map(employee => [employee.id, employee])), [employees]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (item: LegalInvestigation) => {
    setEditing(item);
    setForm({
      investigationNumber: item.investigationNumber,
      investigationDate: item.investigationDate,
      subject: item.subject,
      employeeIds: item.employeeIds,
    });
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.investigationNumber.trim() || !form.investigationDate || !form.subject.trim() || form.employeeIds.length === 0) {
      toast.error('أكمل الحقول المطلوبة للتحقيق');
      return;
    }
    setSaving(true);
    const payload = {
      investigationNumber: form.investigationNumber.trim(),
      investigationDate: form.investigationDate,
      subject: form.subject.trim(),
      employeeIds: form.employeeIds,
    };
    try {
      if (editing) {
        await updateLegalInvestigation(editing.id, payload);
        toast.success('تم تحديث التحقيق');
      } else {
        await createLegalInvestigation(payload);
        toast.success('تمت إضافة التحقيق');
      }
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteLegalInvestigation(deleteTarget.id);
    toast.success('تم حذف التحقيق');
    setDeleteTarget(null);
    load();
  };

  const confirmClose = async () => {
    if (!closeTarget || !closeAt || !finalDecision.trim()) return;
    await closeLegalInvestigation(closeTarget.id, {
      closedAt: closeAt,
      result: closeResult,
      finalDecision: finalDecision.trim(),
      finalRecommendations: finalRecommendations.trim() || undefined,
      closureNotes: closureNotes.trim() || undefined,
    });
    toast.success('تم إغلاق التحقيق');
    setCloseTarget(null);
    setCloseAt('');
    setFinalDecision('');
    setFinalRecommendations('');
    setClosureNotes('');
    load();
  };

  return (
    <div className="space-y-6">
      <LegalPageHeader
        title="التحقيقات"
        subtitle="ملفات التحقيق الداخلي ومتابعة الموظفين والمخرجات النهائية."
        actions={<Button className="rounded-2xl px-5" onClick={openCreate}><Plus className="ms-2 h-4 w-4" />إضافة تحقيق</Button>}
      />

      <LegalDataTable
        rows={investigations}
        searchPlaceholder="بحث برقم التحقيق أو الموضوع"
        columns={[
          { key: 'number', label: 'رقم التحقيق', sortable: true, render: item => item.investigationNumber, sortValue: item => item.investigationNumber, searchValue: item => item.investigationNumber },
          { key: 'date', label: 'تاريخ التحقيق', sortable: true, render: item => item.investigationDate, sortValue: item => item.investigationDate, searchValue: item => item.investigationDate },
          { key: 'subject', label: 'موضوع التحقيق', sortable: true, render: item => item.subject, sortValue: item => item.subject, searchValue: item => item.subject },
          { key: 'employees', label: 'الموظفون المعنيون', render: item => item.employeeIds.map(employeeId => employeeById.get(employeeId)?.name || employeeId).join('، '), searchValue: item => item.employeeIds.map(employeeId => employeeById.get(employeeId)?.name || employeeId).join(' ') },
          { key: 'status', label: 'الحالة', sortable: true, render: item => (item.status === 'OPEN' ? 'مفتوح' : 'مغلق'), sortValue: item => item.status, searchValue: item => item.status },
        ]}
        rowActions={item => (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-2xl" onClick={() => openEdit(item)} disabled={item.status === 'CLOSED'}><Pencil className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-2xl" onClick={() => { setCloseTarget(item); setCloseAt(new Date().toISOString().slice(0, 16)); }} disabled={item.status === 'CLOSED'}><XCircle className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-2xl text-danger" onClick={() => setDeleteTarget(item)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      />

      <LegalFormModal open={open} title={editing ? 'تعديل تحقيق' : 'إضافة تحقيق'} onOpenChange={setOpen} onSubmit={submit} loading={saving}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>رقم التحقيق</Label>
            <Input value={form.investigationNumber} onChange={event => setForm(prev => ({ ...prev, investigationNumber: event.target.value }))} className="h-11 rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Label>تاريخ التحقيق</Label>
            <Input type="date" value={form.investigationDate} onChange={event => setForm(prev => ({ ...prev, investigationDate: event.target.value }))} className="h-11 rounded-2xl" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>موضوع التحقيق</Label>
            <Textarea value={form.subject} onChange={event => setForm(prev => ({ ...prev, subject: event.target.value }))} className="min-h-24 rounded-2xl" />
          </div>
          <div className="md:col-span-2">
            <LegalMultiSelectField
              label="الموظفون المعنيون"
              helperText="اختر الموظفين المشاركين في التحقيق الحالي."
              options={employees.map(employee => ({ value: employee.id, label: employee.name, description: employee.jobTitle }))}
              value={form.employeeIds}
              onChange={next => setForm(prev => ({ ...prev, employeeIds: next }))}
            />
          </div>
        </div>
      </LegalFormModal>

      <LegalFormModal open={Boolean(closeTarget)} title="إغلاق التحقيق" onOpenChange={() => setCloseTarget(null)} onSubmit={event => { event.preventDefault(); void confirmClose(); }}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>تاريخ الإغلاق</Label>
            <Input type="datetime-local" value={closeAt} onChange={event => setCloseAt(event.target.value)} className="h-11 rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Label>النتيجة</Label>
            <Select value={closeResult} onValueChange={value => setCloseResult(value as LegalInvestigationResult)}>
              <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(resultLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>القرار النهائي</Label>
            <Textarea value={finalDecision} onChange={event => setFinalDecision(event.target.value)} className="min-h-24 rounded-2xl" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>التوصيات النهائية</Label>
            <Textarea value={finalRecommendations} onChange={event => setFinalRecommendations(event.target.value)} className="min-h-24 rounded-2xl" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>ملاحظات الإغلاق</Label>
            <Textarea value={closureNotes} onChange={event => setClosureNotes(event.target.value)} className="min-h-24 rounded-2xl" />
          </div>
        </div>
      </LegalFormModal>

      <LegalConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف التحقيق"
        description={`هل تريد حذف التحقيق ${deleteTarget?.investigationNumber || ''}؟`}
        confirmLabel="حذف"
        onConfirm={() => void confirmDelete()}
        onOpenChange={() => setDeleteTarget(null)}
      />
    </div>
  );
}
