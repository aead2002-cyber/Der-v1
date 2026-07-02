import React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LegalConfirmDialog } from '@/modules/legal/components/LegalConfirmDialog';
import { LegalDataTable } from '@/modules/legal/components/LegalDataTable';
import { LegalFileUploadField } from '@/modules/legal/components/LegalFileUploadField';
import { LegalFormModal } from '@/modules/legal/components/LegalFormModal';
import { LegalMultiSelectField } from '@/modules/legal/components/LegalMultiSelectField';
import { LegalPageHeader } from '@/modules/legal/components/LegalPageHeader';
import { getLegalEmployees, getLegalInvestigationSessions, getLegalInvestigations, getLegalSummons, createLegalInvestigationSession, updateLegalInvestigationSession, deleteLegalInvestigationSession } from '@/modules/legal/services/legalApi';
import type { LegalEmployee, LegalInvestigation, LegalInvestigationSession, LegalSummons } from '@/modules/legal/types/legal';
import { toast } from 'sonner';

const emptyForm = {
  investigationId: '',
  summonsId: '',
  attendeeEmployeeIds: [] as string[],
  sessionDateTime: '',
  location: '',
  subject: '',
  statementText: '',
  investigatorNotes: '',
};

export default function InvestigationSessionsPage() {
  const [sessions, setSessions] = React.useState<LegalInvestigationSession[]>([]);
  const [employees, setEmployees] = React.useState<LegalEmployee[]>([]);
  const [investigations, setInvestigations] = React.useState<LegalInvestigation[]>([]);
  const [summons, setSummons] = React.useState<LegalSummons[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LegalInvestigationSession | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<LegalInvestigationSession | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const load = React.useCallback(() => {
    void Promise.all([getLegalInvestigationSessions(), getLegalEmployees(), getLegalInvestigations(), getLegalSummons()]).then(([sessionRows, employeeRows, investigationRows, summonsRows]) => {
      setSessions(sessionRows);
      setEmployees(employeeRows);
      setInvestigations(investigationRows);
      setSummons(summonsRows);
    });
  }, []);

  React.useEffect(() => { load(); }, [load]);
  const employeeById = React.useMemo(() => new Map(employees.map(employee => [employee.id, employee])), [employees]);
  const investigationById = React.useMemo(() => new Map(investigations.map(item => [item.id, item])), [investigations]);
  const summonById = React.useMemo(() => new Map(summons.map(item => [item.id, item])), [summons]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSelectedFile(null);
    setOpen(true);
  };

  const openEdit = (item: LegalInvestigationSession) => {
    setEditing(item);
    setForm({
      investigationId: item.investigationId,
      summonsId: item.summonsId || '',
      attendeeEmployeeIds: item.attendeeEmployeeIds,
      sessionDateTime: item.sessionDateTime.slice(0, 16),
      location: item.location,
      subject: item.subject,
      statementText: item.statementText,
      investigatorNotes: item.investigatorNotes || '',
    });
    setSelectedFile(null);
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.investigationId || !form.sessionDateTime || !form.location.trim() || !form.subject.trim() || !form.statementText.trim() || form.attendeeEmployeeIds.length === 0) {
      toast.error('أكمل الحقول المطلوبة لجلسة التحقيق');
      return;
    }
    setSaving(true);
    const payload = {
      investigationId: form.investigationId,
      summonsId: form.summonsId || undefined,
      attendeeEmployeeIds: form.attendeeEmployeeIds,
      sessionDateTime: new Date(form.sessionDateTime).toISOString(),
      location: form.location.trim(),
      subject: form.subject.trim(),
      statementText: form.statementText.trim(),
      investigatorNotes: form.investigatorNotes.trim() || undefined,
      attachments: selectedFile ? [selectedFile.name] : undefined,
    };
    try {
      if (editing) {
        await updateLegalInvestigationSession(editing.id, payload);
        toast.success('تم تحديث جلسة التحقيق');
      } else {
        await createLegalInvestigationSession(payload);
        toast.success('تمت إضافة جلسة التحقيق');
      }
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteLegalInvestigationSession(deleteTarget.id);
    toast.success('تم حذف جلسة التحقيق');
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="space-y-6">
      <LegalPageHeader
        title="جلسات التحقيق"
        subtitle="جلسات الاستماع والتحقيق الداخلي ومحاضر الأقوال ذات الصلة."
        actions={<Button className="rounded-2xl px-5" onClick={openCreate}><Plus className="ms-2 h-4 w-4" />إضافة جلسة تحقيق</Button>}
      />

      <LegalDataTable
        rows={sessions}
        searchPlaceholder="بحث برقم التحقيق أو موضوع الجلسة"
        columns={[
          { key: 'investigation', label: 'رقم التحقيق', sortable: true, render: item => investigationById.get(item.investigationId)?.investigationNumber || item.investigationId, sortValue: item => investigationById.get(item.investigationId)?.investigationNumber || item.investigationId, searchValue: item => investigationById.get(item.investigationId)?.investigationNumber || item.investigationId },
          { key: 'summons', label: 'رقم الاستدعاء المرتبط', render: item => item.summonsId ? (summonById.get(item.summonsId)?.id || item.summonsId) : '-', searchValue: item => item.summonsId || '' },
          { key: 'attendees', label: 'الحضور', render: item => item.attendeeEmployeeIds.map(employeeId => employeeById.get(employeeId)?.name || employeeId).join('، '), searchValue: item => item.attendeeEmployeeIds.map(employeeId => employeeById.get(employeeId)?.name || employeeId).join(' ') },
          { key: 'datetime', label: 'تاريخ ووقت الجلسة', sortable: true, render: item => item.sessionDateTime, sortValue: item => item.sessionDateTime, searchValue: item => item.sessionDateTime },
          { key: 'location', label: 'مكان الجلسة', sortable: true, render: item => item.location, sortValue: item => item.location, searchValue: item => item.location },
          { key: 'subject', label: 'موضوع الجلسة', sortable: true, render: item => item.subject, sortValue: item => item.subject, searchValue: item => item.subject },
        ]}
        rowActions={item => (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-2xl" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-2xl text-danger" onClick={() => setDeleteTarget(item)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      />

      <LegalFormModal open={open} title={editing ? 'تعديل جلسة تحقيق' : 'إضافة جلسة تحقيق'} onOpenChange={setOpen} onSubmit={submit} loading={saving}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>التحقيق</Label>
            <Select value={form.investigationId} onValueChange={value => setForm(prev => ({ ...prev, investigationId: value }))}>
              <SelectTrigger className="h-11 rounded-2xl"><SelectValue placeholder="اختر التحقيق" /></SelectTrigger>
              <SelectContent>{investigations.map(item => <SelectItem key={item.id} value={item.id}>{item.investigationNumber}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الاستدعاء المرتبط</Label>
            <Select value={form.summonsId} onValueChange={value => setForm(prev => ({ ...prev, summonsId: value === "__none__" ? "" : value }))}>
              <SelectTrigger className="h-11 rounded-2xl"><SelectValue placeholder="اختياري" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">بدون استدعاء</SelectItem>
                {summons.map(item => <SelectItem key={item.id} value={item.id}>{item.id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>تاريخ ووقت الجلسة</Label>
            <Input type="datetime-local" value={form.sessionDateTime} onChange={event => setForm(prev => ({ ...prev, sessionDateTime: event.target.value }))} className="h-11 rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Label>مكان الجلسة</Label>
            <Input value={form.location} onChange={event => setForm(prev => ({ ...prev, location: event.target.value }))} className="h-11 rounded-2xl" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>موضوع الجلسة</Label>
            <Input value={form.subject} onChange={event => setForm(prev => ({ ...prev, subject: event.target.value }))} className="h-11 rounded-2xl" />
          </div>
          <div className="md:col-span-2">
            <LegalMultiSelectField
              label="الحضور"
              helperText="اختر الموظفين الحاضرين في الجلسة الحالية."
              options={employees.map(employee => ({ value: employee.id, label: employee.name, description: employee.jobTitle }))}
              value={form.attendeeEmployeeIds}
              onChange={next => setForm(prev => ({ ...prev, attendeeEmployeeIds: next }))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>نص الإفادة</Label>
            <Textarea value={form.statementText} onChange={event => setForm(prev => ({ ...prev, statementText: event.target.value }))} className="min-h-24 rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Label>ملف مرفق</Label>
            <LegalFileUploadField value={selectedFile} onChange={setSelectedFile} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>ملاحظات المحقق</Label>
            <Textarea value={form.investigatorNotes} onChange={event => setForm(prev => ({ ...prev, investigatorNotes: event.target.value }))} className="min-h-24 rounded-2xl" />
          </div>
        </div>
      </LegalFormModal>

      <LegalConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف جلسة التحقيق"
        description={`هل تريد حذف جلسة التحقيق ${deleteTarget?.investigationId || ''}؟`}
        confirmLabel="حذف"
        onConfirm={() => void confirmDelete()}
        onOpenChange={() => setDeleteTarget(null)}
      />
    </div>
  );
}

