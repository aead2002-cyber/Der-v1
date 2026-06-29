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
import { getLegalParties, createLegalParty, updateLegalParty, deleteLegalParty } from '@/modules/legal/services/legalApi';
import type { LegalParty, LegalPartyType } from '@/modules/legal/types/legal';
import { toast } from 'sonner';

const partyTypeLabels: Record<LegalPartyType, string> = {
  PERSON: 'فرد',
  COMPANY: 'شركة',
  GOVERNMENT: 'جهة حكومية',
  OTHER: 'أخرى',
};

const emptyForm = {
  name: '',
  partyType: 'PERSON' as LegalPartyType,
  identityNumber: '',
  contactInfo: '',
  notes: '',
};

export default function PartiesPage() {
  const [parties, setParties] = React.useState<LegalParty[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LegalParty | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<LegalParty | null>(null);

  const load = React.useCallback(() => {
    void getLegalParties().then(setParties);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (party: LegalParty) => {
    setEditing(party);
    setForm({
      name: party.name,
      partyType: party.partyType,
      identityNumber: party.identityNumber || '',
      contactInfo: party.contactInfo || '',
      notes: party.notes || '',
    });
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return toast.error('اسم الطرف مطلوب');
    setSaving(true);
    try {
      if (editing) {
        await updateLegalParty(editing.id, {
          name: form.name.trim(),
          partyType: form.partyType,
          identityNumber: form.identityNumber.trim() || undefined,
          contactInfo: form.contactInfo.trim() || undefined,
          notes: form.notes.trim() || undefined,
        });
        toast.success('تم تحديث الطرف بنجاح');
      } else {
        await createLegalParty({
          name: form.name.trim(),
          partyType: form.partyType,
          identityNumber: form.identityNumber.trim() || undefined,
          contactInfo: form.contactInfo.trim() || undefined,
          notes: form.notes.trim() || undefined,
        });
        toast.success('تمت إضافة الطرف بنجاح');
      }
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteLegalParty(deleteTarget.id);
    toast.success('تم حذف الطرف');
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="space-y-6">
      <LegalPageHeader
        title="الأطراف والجهات"
        subtitle="إدارة الأطراف المرتبطة بالقضايا القانونية كالأشخاص والشركات والجهات الرسمية."
        actions={<Button className="rounded-2xl bg-slate-900 px-5 text-white hover:bg-slate-900" onClick={openCreate}><Plus className="ms-2 h-4 w-4" />إضافة طرف</Button>}
      />

      <LegalDataTable
        rows={parties}
        searchPlaceholder="بحث باسم الطرف أو رقم الهوية"
        columns={[
          { key: 'name', label: 'اسم الطرف', sortable: true, render: party => party.name, sortValue: party => party.name, searchValue: party => party.name },
          { key: 'type', label: 'نوع الطرف', sortable: true, render: party => partyTypeLabels[party.partyType], sortValue: party => party.partyType, searchValue: party => party.partyType },
          { key: 'identity', label: 'رقم الهوية أو السجل', render: party => party.identityNumber || '-', searchValue: party => party.identityNumber || '' },
          { key: 'contact', label: 'بيانات التواصل', render: party => party.contactInfo || '-', searchValue: party => party.contactInfo || '' },
          { key: 'notes', label: 'ملاحظات', render: party => party.notes || '-', searchValue: party => party.notes || '' },
        ]}
        rowActions={party => (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-2xl border-slate-200" onClick={() => openEdit(party)}><Pencil className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setDeleteTarget(party)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      />

      <LegalFormModal open={open} title={editing ? 'تعديل طرف' : 'إضافة طرف'} onOpenChange={setOpen} onSubmit={submit} loading={saving}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>اسم الطرف</Label>
            <Input value={form.name} onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))} className="h-11 rounded-2xl border-slate-200" />
          </div>
          <div className="space-y-2">
            <Label>نوع الطرف</Label>
            <Select value={form.partyType} onValueChange={value => setForm(prev => ({ ...prev, partyType: value as LegalPartyType }))}>
              <SelectTrigger className="h-11 rounded-2xl border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(partyTypeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>رقم الهوية أو السجل</Label>
            <Input value={form.identityNumber} onChange={event => setForm(prev => ({ ...prev, identityNumber: event.target.value }))} className="h-11 rounded-2xl border-slate-200" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>بيانات التواصل</Label>
            <Input value={form.contactInfo} onChange={event => setForm(prev => ({ ...prev, contactInfo: event.target.value }))} className="h-11 rounded-2xl border-slate-200" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>ملاحظات</Label>
            <Textarea value={form.notes} onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))} className="min-h-28 rounded-2xl border-slate-200" />
          </div>
        </div>
      </LegalFormModal>

      <LegalConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف الطرف"
        description={`هل تريد حذف الطرف ${deleteTarget?.name || ''}؟`}
        confirmLabel="حذف"
        onConfirm={() => void confirmDelete()}
        onOpenChange={() => setDeleteTarget(null)}
      />
    </div>
  );
}
