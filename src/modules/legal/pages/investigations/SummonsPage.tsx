import React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LegalConfirmDialog } from '@/modules/legal/components/LegalConfirmDialog';
import { LegalDataTable } from '@/modules/legal/components/LegalDataTable';
import { LegalFormModal } from '@/modules/legal/components/LegalFormModal';
import { LegalPageHeader } from '@/modules/legal/components/LegalPageHeader';
import { getLegalEmployees, getLegalSummons, getLegalInvestigations, createLegalSummons, updateLegalSummons, deleteLegalSummons } from '@/modules/legal/services/legalApi';
import type { LegalEmployee, LegalInvestigation, LegalSummons, LegalSummonsStatus } from '@/modules/legal/types/legal';
import { toast } from 'sonner';

const statusLabels: Record<LegalSummonsStatus, string> = {
  SENT: 'مرسل',
  CONFIRMED: 'مؤكد',
  NO_SHOW: 'لم يحضر',
  CANCELLED: 'ملغي',
};

const emptyForm = {
  investigationId: '',
  employeeId: '',
  sessionDateTime: '',
  location: '',
  subject: '',
  notes: '',
  status: 'SENT' as LegalSummonsStatus,
};

export default function SummonsPage() {
  const [summons, setSummons] = React.useState<LegalSummons[]>([]);
  const [employees, setEmployees] = React.useState<LegalEmployee[]>([]);
  const [investigations, setInvestigations] = React.useState<LegalInvestigation[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LegalSummons | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<LegalSummons | null>(null);

  const load = React.useCallback(() => {
    void Promise.all([getLegalSummons(), getLegalEmployees(), getLegalInvestigations()]).then(([summonsRows, employeeRows, investigationRows]) => {
      setSummons(summonsRows);
      setEmployees(employeeRows);
      setInvestigations(investigationRows);
    });
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const employeeById = React.useMemo(() => new Map(employees.map(employee => [employee.id, employee])), [employees]);
  const investigationById = React.useMemo(() => new Map(investigations.map(item => [item.id, item])), [investigations]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (item: LegalSummons) => {
    setEditing(item);
    setForm({
      investigationId: item.investigationId,
      employeeId: item.employeeId,
      sessionDateTime: item.sessionDateTime.slice(0, 16),
      location: item.location,
      subject: item.subject,
      notes: item.notes || '',
      status: item.status,
    });
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.investigationId || !form.employeeId || !form.sessionDateTime || !form.location.trim() || !form.subject.trim()) {
      toast.error('أكمل الحقول المطلوبة للاستدعاء');
      return;
    }
    setSaving(true);
    const payload = {
      investigationId: form.investigationId,
      employeeId: form.employeeId,
      sessionDateTime: new Date(form.sessionDateTime).toISOString(),
      location: form.location.trim(),
      subject: form.subject.trim(),
      notes: form.notes.trim() || undefined,
      status: form.status,
    };
    try {
      if (editing) {
        await updateLegalSummons(editing.id, payload);
        toast.success('تم تحديث الاستدعاء');
      } else {
        await createLegalSummons(payload);
        toast.success('تم إنشاء الاستدعاء');
      }
      toast.success('سيتم إرسال بريد الاستدعاء بعد ربط الباك اند القانونية');
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteLegalSummons(deleteTarget.id);
    toast.success('تم حذف الاستدعاء');
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="space-y-6">
      <LegalPageHeader
        title="الاستدعاءات"
        subtitle="الاستدعاءات القانونية المرسلة للموظفين ومواعيد الجلسات الخاصة بها."
        actions={<Button className="rounded-2xl bg-slate-900 px-5 text-white hover:bg-slate-900" onClick={openCreate}><Plus className="ms-2 h-4 w-4" />إنشاء استدعاء</Button>}
      />

      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600 shadow-sm">
        سيتم إرسال بريد الاستدعاء بعد ربط باك اند القانونية.
      </div>

      <LegalDataTable
        rows={summons}
        searchPlaceholder="بحث برقم التحقيق أو اسم الموظف"
        columns={[
          { key: 'investigation', label: 'رقم التحقيق', sortable: true, render: item => investigationById.get(item.investigationId)?.investigationNumber || item.investigationId, sortValue: item => investigationById.get(item.investigationId)?.investigationNumber || item.investigationId, searchValue: item => investigationById.get(item.investigationId)?.investigationNumber || item.investigationId },
          { key: 'employee', label: 'الموظف المستدعى', sortable: true, render: item => employeeById.get(item.employeeId)?.name || item.employeeId, sortValue: item => employeeById.get(item.employeeId)?.name || item.employeeId, searchValue: item => employeeById.get(item.employeeId)?.name || item.employeeId },
          { key: 'datetime', label: 'تاريخ ووقت جلسة التحقيق', sortable: true, render: item => item.sessionDateTime, sortValue: item => item.sessionDateTime, searchValue: item => item.sessionDateTime },
          { key: 'location', label: 'مكان التحقيق', sortable: true, render: item => item.location, sortValue: item => item.location, searchValue: item => item.location },
          { key: 'subject', label: 'موضوع التحقيق', sortable: true, render: item => item.subject, sortValue: item => item.subject, searchValue: item => item.subject },
          { key: 'status', label: 'حالة الاستدعاء', sortable: true, render: item => statusLabels[item.status], sortValue: item => item.status, searchValue: item => statusLabels[item.status] },
        ]}
        rowActions={item => (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-2xl border-slate-200" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setDeleteTarget(item)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      />

      <LegalFormModal open={open} title={editing ? 'تعديل استدعاء' : 'إنشاء استدعاء'} onOpenChange={setOpen} onSubmit={submit} loading={saving}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>التحقيق</Label>
            <Select value={form.investigationId} onValueChange={value => setForm(prev => ({ ...prev, investigationId: value }))}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-200"><SelectValue placeholder="اختر التحقيق" /></SelectTrigger>
              <SelectContent>{investigations.map(item => <SelectItem key={item.id} value={item.id}>{item.investigationNumber}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الموظف المستدعى</Label>
            <Select value={form.employeeId} onValueChange={value => setForm(prev => ({ ...prev, employeeId: value }))}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-200"><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
              <SelectContent>{employees.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>تاريخ ووقت جلسة التحقيق</Label>
            <Input type="datetime-local" value={form.sessionDateTime} onChange={event => setForm(prev => ({ ...prev, sessionDateTime: event.target.value }))} className="h-11 rounded-2xl border-slate-200" />
          </div>
          <div className="space-y-2">
            <Label>حالة الاستدعاء</Label>
            <Select value={form.status} onValueChange={value => setForm(prev => ({ ...prev, status: value as LegalSummonsStatus }))}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>مكان التحقيق</Label>
            <Input value={form.location} onChange={event => setForm(prev => ({ ...prev, location: event.target.value }))} className="h-11 rounded-2xl border-slate-200" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>موضوع التحقيق</Label>
            <Textarea value={form.subject} onChange={event => setForm(prev => ({ ...prev, subject: event.target.value }))} className="min-h-24 rounded-2xl border-slate-200" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>ملاحظات</Label>
            <Textarea value={form.notes} onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))} className="min-h-24 rounded-2xl border-slate-200" />
          </div>
        </div>
      </LegalFormModal>

      <LegalConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف استدعاء"
        description={`هل تريد حذف الاستدعاء الخاص بـ ${deleteTarget ? (employeeById.get(deleteTarget.employeeId)?.name || deleteTarget.employeeId) : ''}؟`}
        confirmLabel="حذف"
        onConfirm={() => void confirmDelete()}
        onOpenChange={() => setDeleteTarget(null)}
      />
    </div>
  );
}
