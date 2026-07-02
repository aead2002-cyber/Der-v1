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
import { LegalPageHeader } from '@/modules/legal/components/LegalPageHeader';
import { getLegalCaseSessions, getLegalCases, createLegalCaseSession, updateLegalCaseSession, deleteLegalCaseSession } from '@/modules/legal/services/legalApi';
import type { LegalCase, LegalCaseSession, LegalSessionJudgmentStatus } from '@/modules/legal/types/legal';
import { toast } from 'sonner';

const judgmentLabels: Record<LegalSessionJudgmentStatus, string> = {
  IN_OUR_FAVOR: 'لصالحنا',
  AGAINST_US: 'ضدنا',
  POSTPONED: 'تأجيل',
  UNDER_REVIEW: 'تحت المراجعة',
  OTHER: 'أخرى',
};

const attendeeRoleLabels = ['محامي', 'شاهد', 'خبير', 'ممثل عن الجهة', 'طرف آخر'];

const emptyForm = {
  caseId: '',
  sessionDateTime: '',
  location: '',
  attendees: '',
  attendeeRoles: '',
  judgmentStatus: 'UNDER_REVIEW' as LegalSessionJudgmentStatus,
  judgmentText: '',
  notes: '',
  nextSessionDate: '',
};

export default function CaseSessionsPage() {
  const [sessions, setSessions] = React.useState<LegalCaseSession[]>([]);
  const [cases, setCases] = React.useState<LegalCase[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LegalCaseSession | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<LegalCaseSession | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const load = React.useCallback(() => {
    void Promise.all([getLegalCases(), getLegalCaseSessions()]).then(([casesRows, sessionRows]) => {
      setCases(casesRows);
      setSessions(sessionRows);
    });
  }, []);

  React.useEffect(() => { load(); }, [load]);
  const caseById = React.useMemo(() => new Map(cases.map(item => [item.id, item])), [cases]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSelectedFile(null);
    setOpen(true);
  };

  const openEdit = (item: LegalCaseSession) => {
    setEditing(item);
    setForm({
      caseId: item.caseId,
      sessionDateTime: item.sessionDateTime.slice(0, 16),
      location: item.location,
      attendees: item.attendees.join(', '),
      attendeeRoles: item.attendeeRoles.join(', '),
      judgmentStatus: item.judgmentStatus,
      judgmentText: item.judgmentText || '',
      notes: item.notes || '',
      nextSessionDate: item.nextSessionDate || '',
    });
    setSelectedFile(null);
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.caseId || !form.sessionDateTime || !form.location.trim() || !form.attendees.trim() || !form.attendeeRoles.trim()) {
      toast.error('أكمل الحقول المطلوبة للجلسة');
      return;
    }
    setSaving(true);
    const payload = {
      caseId: form.caseId,
      sessionDateTime: new Date(form.sessionDateTime).toISOString(),
      location: form.location.trim(),
      attendees: form.attendees.split(',').map(item => item.trim()).filter(Boolean),
      attendeeRoles: form.attendeeRoles.split(',').map(item => item.trim()).filter(Boolean),
      judgmentStatus: form.judgmentStatus,
      judgmentText: form.judgmentText.trim() || undefined,
      notes: form.notes.trim() || undefined,
      nextSessionDate: form.nextSessionDate || undefined,
      attachments: selectedFile ? [selectedFile.name] : undefined,
    };
    try {
      if (editing) {
        await updateLegalCaseSession(editing.id, payload);
        toast.success('تم تحديث الجلسة');
      } else {
        await createLegalCaseSession(payload);
        toast.success('تمت إضافة الجلسة');
      }
      toast.success('سيتم إرسال تنبيه بريدي للمشرفين بعد ربط الباك اند');
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteLegalCaseSession(deleteTarget.id);
    toast.success('تم حذف الجلسة');
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="space-y-6">
      <LegalPageHeader
        title="جلسات القضايا"
        subtitle="عرض الجلسات القانونية وما يرتبط بها من مواعيد ومتابعات."
        actions={<Button className="rounded-2xl px-5" onClick={openCreate}><Plus className="ms-2 h-4 w-4" />إضافة جلسة</Button>}
      />

      <LegalDataTable
        rows={sessions}
        searchPlaceholder="بحث برقم القضية أو مكان الجلسة"
        columns={[
          { key: 'case', label: 'رقم القضية', sortable: true, render: session => caseById.get(session.caseId)?.internalCaseNumber || session.caseId, sortValue: session => caseById.get(session.caseId)?.internalCaseNumber || session.caseId, searchValue: session => caseById.get(session.caseId)?.internalCaseNumber || session.caseId },
          { key: 'datetime', label: 'تاريخ ووقت الجلسة', sortable: true, render: session => session.sessionDateTime, sortValue: session => session.sessionDateTime, searchValue: session => session.sessionDateTime },
          { key: 'location', label: 'مكان الجلسة', sortable: true, render: session => session.location, sortValue: session => session.location, searchValue: session => session.location },
          { key: 'attendees', label: 'الحضور', render: session => session.attendees.join('، '), searchValue: session => session.attendees.join(' ') },
          { key: 'roles', label: 'صفة الحضور', render: session => session.attendeeRoles.join('، '), searchValue: session => session.attendeeRoles.join(' ') },
          { key: 'judgment', label: 'نتيجة الجلسة', sortable: true, render: session => judgmentLabels[session.judgmentStatus], sortValue: session => session.judgmentStatus, searchValue: session => judgmentLabels[session.judgmentStatus] },
          { key: 'next', label: 'الجلسة القادمة', render: session => session.nextSessionDate || '-', searchValue: session => session.nextSessionDate || '' },
        ]}
        rowActions={session => (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-2xl" onClick={() => openEdit(session)}><Pencil className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-2xl text-danger" onClick={() => setDeleteTarget(session)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      />

      <LegalFormModal open={open} title={editing ? 'تعديل جلسة' : 'إضافة جلسة'} onOpenChange={setOpen} onSubmit={submit} loading={saving}>
        <div className="space-y-4">
          {!editing ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">بعد الحفظ سيتم إرسال إشعار بريد للمشرفين بعد ربط الباك اند القانوني.</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>القضية</Label>
              <Select value={form.caseId} onValueChange={value => setForm(prev => ({ ...prev, caseId: value }))}>
                <SelectTrigger className="h-11 rounded-2xl"><SelectValue placeholder="اختر القضية" /></SelectTrigger>
                <SelectContent>{cases.map(item => <SelectItem key={item.id} value={item.id}>{item.internalCaseNumber}</SelectItem>)}</SelectContent>
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
            <div className="space-y-2">
              <Label>نتيجة الجلسة</Label>
              <Select value={form.judgmentStatus} onValueChange={value => setForm(prev => ({ ...prev, judgmentStatus: value as LegalSessionJudgmentStatus }))}>
                <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(judgmentLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>الحضور</Label>
              <Input value={form.attendees} onChange={event => setForm(prev => ({ ...prev, attendees: event.target.value }))} className="h-11 rounded-2xl" placeholder="u-1, u-2" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>صفة الحضور</Label>
              <Input value={form.attendeeRoles} onChange={event => setForm(prev => ({ ...prev, attendeeRoles: event.target.value }))} className="h-11 rounded-2xl" placeholder={attendeeRoleLabels.join(', ')} />
            </div>
            <div className="space-y-2">
              <Label>الجلسة القادمة</Label>
              <Input type="date" value={form.nextSessionDate} onChange={event => setForm(prev => ({ ...prev, nextSessionDate: event.target.value }))} className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>ملف مرفق</Label>
              <LegalFileUploadField value={selectedFile} onChange={setSelectedFile} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>نص الحكم / الملاحظات</Label>
              <Textarea value={form.judgmentText} onChange={event => setForm(prev => ({ ...prev, judgmentText: event.target.value }))} className="min-h-24 rounded-2xl" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>ملاحظات إضافية</Label>
              <Textarea value={form.notes} onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))} className="min-h-24 rounded-2xl" />
            </div>
          </div>
        </div>
      </LegalFormModal>

      <LegalConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف جلسة القضية"
        description={`هل تريد حذف جلسة القضية ${deleteTarget?.caseId || ''}؟`}
        confirmLabel="حذف"
        onConfirm={() => void confirmDelete()}
        onOpenChange={() => setDeleteTarget(null)}
      />
    </div>
  );
}
