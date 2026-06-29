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
import { getLegalEmployees, createLegalEmployee, updateLegalEmployee, deleteLegalEmployee } from '@/modules/legal/services/legalApi';
import type { LegalEmployee, LegalEmployeeStatus } from '@/modules/legal/types/legal';
import { toast } from 'sonner';

const statusLabels: Record<LegalEmployeeStatus, string> = {
  ACTIVE: 'نشط',
  INACTIVE: 'غير نشط',
};

const emptyForm = {
  name: '',
  employeeNumber: '',
  department: '',
  jobTitle: '',
  email: '',
  mobile: '',
  status: 'ACTIVE' as LegalEmployeeStatus,
};

export default function EmployeesPage() {
  const [employees, setEmployees] = React.useState<LegalEmployee[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LegalEmployee | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<LegalEmployee | null>(null);

  const load = React.useCallback(() => {
    void getLegalEmployees().then(setEmployees);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (item: LegalEmployee) => {
    setEditing(item);
    setForm({
      name: item.name,
      employeeNumber: item.employeeNumber,
      department: item.department,
      jobTitle: item.jobTitle,
      email: item.email,
      mobile: item.mobile || '',
      status: item.status,
    });
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.employeeNumber.trim() || !form.department.trim() || !form.jobTitle.trim() || !form.email.trim()) {
      toast.error('أكمل الحقول المطلوبة للموظف');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      employeeNumber: form.employeeNumber.trim(),
      department: form.department.trim(),
      jobTitle: form.jobTitle.trim(),
      email: form.email.trim(),
      mobile: form.mobile.trim() || undefined,
      status: form.status,
    };
    try {
      if (editing) {
        await updateLegalEmployee(editing.id, payload);
        toast.success('تم تحديث الموظف');
      } else {
        await createLegalEmployee(payload);
        toast.success('تمت إضافة الموظف');
      }
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteLegalEmployee(deleteTarget.id);
    toast.success('تم حذف الموظف');
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="space-y-6">
      <LegalPageHeader
        title="الموظفون"
        subtitle="إدارة الموظفين المشاركين في التحقيقات والاستدعاءات القانونية."
        actions={<Button className="rounded-2xl bg-slate-900 px-5 text-white hover:bg-slate-900" onClick={openCreate}><Plus className="ms-2 h-4 w-4" />إضافة موظف</Button>}
      />

      <LegalDataTable
        rows={employees}
        searchPlaceholder="بحث باسم الموظف أو الرقم الوظيفي"
        columns={[
          { key: 'name', label: 'اسم الموظف', sortable: true, render: item => item.name, sortValue: item => item.name, searchValue: item => item.name },
          { key: 'employeeNumber', label: 'الرقم الوظيفي', sortable: true, render: item => item.employeeNumber, sortValue: item => item.employeeNumber, searchValue: item => item.employeeNumber },
          { key: 'department', label: 'القسم', sortable: true, render: item => item.department, sortValue: item => item.department, searchValue: item => item.department },
          { key: 'jobTitle', label: 'المسمى الوظيفي', sortable: true, render: item => item.jobTitle, sortValue: item => item.jobTitle, searchValue: item => item.jobTitle },
          { key: 'email', label: 'البريد الإلكتروني', sortable: true, render: item => item.email, sortValue: item => item.email, searchValue: item => item.email },
          { key: 'mobile', label: 'الجوال', render: item => item.mobile || '-', searchValue: item => item.mobile || '' },
          { key: 'status', label: 'الحالة', sortable: true, render: item => statusLabels[item.status], sortValue: item => item.status, searchValue: item => statusLabels[item.status] },
        ]}
        rowActions={item => (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-2xl border-slate-200" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setDeleteTarget(item)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      />

      <LegalFormModal open={open} title={editing ? 'تعديل موظف' : 'إضافة موظف'} onOpenChange={setOpen} onSubmit={submit} loading={saving}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>اسم الموظف</Label>
            <Input value={form.name} onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))} className="h-11 rounded-2xl border-slate-200" />
          </div>
          <div className="space-y-2">
            <Label>الرقم الوظيفي</Label>
            <Input value={form.employeeNumber} onChange={event => setForm(prev => ({ ...prev, employeeNumber: event.target.value }))} className="h-11 rounded-2xl border-slate-200" />
          </div>
          <div className="space-y-2">
            <Label>القسم</Label>
            <Input value={form.department} onChange={event => setForm(prev => ({ ...prev, department: event.target.value }))} className="h-11 rounded-2xl border-slate-200" />
          </div>
          <div className="space-y-2">
            <Label>المسمى الوظيفي</Label>
            <Input value={form.jobTitle} onChange={event => setForm(prev => ({ ...prev, jobTitle: event.target.value }))} className="h-11 rounded-2xl border-slate-200" />
          </div>
          <div className="space-y-2">
            <Label>البريد الإلكتروني</Label>
            <Input type="email" value={form.email} onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))} className="h-11 rounded-2xl border-slate-200" />
          </div>
          <div className="space-y-2">
            <Label>الجوال</Label>
            <Input value={form.mobile} onChange={event => setForm(prev => ({ ...prev, mobile: event.target.value }))} className="h-11 rounded-2xl border-slate-200" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>الحالة</Label>
            <Select value={form.status} onValueChange={value => setForm(prev => ({ ...prev, status: value as LegalEmployeeStatus }))}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">نشط</SelectItem>
                <SelectItem value="INACTIVE">غير نشط</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </LegalFormModal>

      <LegalConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف الموظف"
        description={`هل تريد حذف الموظف ${deleteTarget?.name || ''}؟`}
        confirmLabel="حذف"
        onConfirm={() => void confirmDelete()}
        onOpenChange={() => setDeleteTarget(null)}
      />
    </div>
  );
}
