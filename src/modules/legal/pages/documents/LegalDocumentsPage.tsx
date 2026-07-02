import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
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
import { getLegalCases, getLegalDocuments, getLegalInvestigations, createLegalDocument, deleteLegalDocument } from '@/modules/legal/services/legalApi';
import type { LegalCase, LegalDocumentCategory, LegalDocumentListItem, LegalDocumentSource, LegalInvestigation } from '@/modules/legal/types/legal';
import { toast } from 'sonner';

const sourceLabels: Record<LegalDocumentSource, string> = {
  CASE: 'قضية',
  INVESTIGATION: 'تحقيق',
  CONTRACT: 'عقد',
  GENERAL: 'عام',
};

const categoryLabels: Record<LegalDocumentCategory, string> = {
  CONTRACT: 'عقد',
  MEMO: 'مذكرة',
  JUDGMENT: 'حكم',
  MINUTES: 'محضر',
  OTHER: 'أخرى',
};

const emptyForm = {
  source: 'CASE' as LegalDocumentSource,
  relationId: '',
  description: '',
  documentCategory: 'OTHER' as LegalDocumentCategory,
};

export default function LegalDocumentsPage() {
  const [documents, setDocuments] = React.useState<LegalDocumentListItem[]>([]);
  const [cases, setCases] = React.useState<LegalCase[]>([]);
  const [investigations, setInvestigations] = React.useState<LegalInvestigation[]>([]);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<LegalDocumentListItem | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const load = React.useCallback(() => {
    void Promise.all([getLegalDocuments(), getLegalCases(), getLegalInvestigations()]).then(([docRows, caseRows, investigationRows]) => {
      setDocuments(docRows);
      setCases(caseRows);
      setInvestigations(investigationRows);
    });
  }, []);

  React.useEffect(() => { load(); }, [load]);
  const caseById = React.useMemo(() => new Map(cases.map(item => [item.id, item])), [cases]);
  const investigationById = React.useMemo(() => new Map(investigations.map(item => [item.id, item])), [investigations]);

  const openCreate = () => {
    setForm(emptyForm);
    setSelectedFile(null);
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.description.trim() || !selectedFile) {
      toast.error('أكمل الحقول المطلوبة للوثيقة');
      return;
    }
    setSaving(true);
    try {
      await createLegalDocument({
        source: form.source,
        relationId: form.source === 'GENERAL' ? 'general' : form.relationId || undefined,
        description: form.description.trim(),
        fileName: selectedFile.name,
        fileType: selectedFile.type || 'application/octet-stream',
        documentCategory: form.documentCategory,
        addedByUserId: 'current-user',
      });
      toast.success('تمت إضافة الوثيقة');
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteLegalDocument(deleteTarget.id);
    toast.success('تم حذف الوثيقة');
    setDeleteTarget(null);
    load();
  };

  const entityLabel = (item: LegalDocumentListItem) => {
    if (item.source === 'CASE') return `${sourceLabels[item.source]} - ${caseById.get(item.relationId)?.internalCaseNumber || item.relationId}`;
    if (item.source === 'INVESTIGATION') return `${sourceLabels[item.source]} - ${investigationById.get(item.relationId)?.investigationNumber || item.relationId}`;
    return sourceLabels[item.source];
  };

  return (
    <div className="space-y-6">
      <LegalPageHeader
        title="الوثائق القانونية"
        subtitle="جميع المستندات المرتبطة بالقضايا والتحقيقات والوثائق العامة في مكان واحد."
        actions={<Button className="rounded-2xl px-5" onClick={openCreate}><Plus className="ms-2 h-4 w-4" />إضافة وثيقة</Button>}
      />

      <LegalDataTable
        rows={documents}
        searchPlaceholder="بحث بالوصف أو اسم الملف"
        columns={[
          { key: 'description', label: 'الوصف', sortable: true, render: item => item.description, sortValue: item => item.description, searchValue: item => item.description },
          { key: 'source', label: 'نوع الارتباط', sortable: true, render: item => sourceLabels[item.source], sortValue: item => item.source, searchValue: item => sourceLabels[item.source] },
          { key: 'filename', label: 'اسم الملف', sortable: true, render: item => item.fileName, sortValue: item => item.fileName, searchValue: item => item.fileName },
          { key: 'filetype', label: 'نوع الملف', sortable: true, render: item => item.fileType, sortValue: item => item.fileType, searchValue: item => item.fileType },
          { key: 'date', label: 'تاريخ الإضافة', sortable: true, render: item => item.addedAt, sortValue: item => item.addedAt, searchValue: item => item.addedAt },
          { key: 'user', label: 'مضاف بواسطة', render: item => item.addedByUserId, searchValue: item => item.addedByUserId },
          { key: 'relation', label: 'الارتباط', render: item => entityLabel(item), searchValue: item => entityLabel(item) },
          { key: 'category', label: 'الفئة', render: item => item.documentCategory ? categoryLabels[item.documentCategory] : '-', searchValue: item => item.documentCategory ? categoryLabels[item.documentCategory] : '' },
        ]}
        rowActions={item => (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-2xl text-danger" onClick={() => setDeleteTarget(item)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      />

      <LegalFormModal open={open} title="إضافة وثيقة" onOpenChange={setOpen} onSubmit={submit} loading={saving}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>نوع الارتباط</Label>
            <Select value={form.source} onValueChange={value => setForm(prev => ({ ...prev, source: value as LegalDocumentSource, relationId: value === 'GENERAL' ? '' : prev.relationId }))}>
              <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(sourceLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الفئة</Label>
            <Select value={form.documentCategory} onValueChange={value => setForm(prev => ({ ...prev, documentCategory: value as LegalDocumentCategory }))}>
              <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(categoryLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {form.source !== 'GENERAL' ? (
            <div className="space-y-2 md:col-span-2">
              <Label>معرّف الارتباط</Label>
              <Input value={form.relationId} onChange={event => setForm(prev => ({ ...prev, relationId: event.target.value }))} className="h-11 rounded-2xl" placeholder={form.source === 'CASE' ? 'case-1' : 'inv-1'} />
              <p className="text-xs leading-6 text-text-muted">مؤقتاً: أدخل معرّف القضية أو التحقيق المرتبط.</p>
            </div>
          ) : null}
          <div className="space-y-2 md:col-span-2">
            <Label>الوصف</Label>
            <Textarea value={form.description} onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))} className="min-h-24 rounded-2xl" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>الملف</Label>
            <LegalFileUploadField value={selectedFile} onChange={setSelectedFile} />
          </div>
        </div>
      </LegalFormModal>

      <LegalConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف الوثيقة"
        description={`هل تريد حذف الوثيقة ${deleteTarget?.description || ''}؟`}
        confirmLabel="حذف"
        onConfirm={() => void confirmDelete()}
        onOpenChange={() => setDeleteTarget(null)}
      />
    </div>
  );
}
