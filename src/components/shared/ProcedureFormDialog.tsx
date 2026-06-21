import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, X, Info, Calendar, User, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { mockService } from '@/services/mockService';
import { proceduresApi } from '@/services/proceduresApi';
import { policiesApi } from '@/services/policiesApi';
import { standardsApi } from '@/services/standardsApi';
import { usersApi } from '@/services/usersApi';
import { Procedure, Policy, Standard, User as UserType } from '@/types';
import { toast } from 'sonner';
import { AttachmentsField } from './AttachmentsField';

interface Props {
  open: boolean;
  procedureId: string | null;
  parentId?: string;
  onSaved: () => void | Promise<void>;
  onClose: () => void;
}

const emptyForm = {
  nameAr: '',
  nameEn: '',
  descriptionAr: '',
  descriptionEn: '',
  policyId: '',
  standardId: '',
  status: 'not_started' as string,
  importance: 'medium' as string,
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  assignedTo: [] as string[],
  isPeriodic: false,
  frequency: 'annual' as any,
  attachments: [] as string[],
  weight: 1 as number,
};

export function ProcedureFormDialog({ open, procedureId, parentId, onSaved, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [allProcedures, setAllProcedures] = useState<Procedure[]>([]);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (!open) return;
    const loadData = async () => {
      try {
        const [policyRows, standardRows, procedureRows, userRows] = await Promise.all([
          policiesApi.getPolicies(),
          standardsApi.getStandards(),
          proceduresApi.getProcedures(),
          usersApi.getUsers(),
        ]);
        setPolicies(policyRows);
        setStandards(standardRows);
        setAllProcedures(procedureRows);
        setUsers(userRows);

        if (procedureId) {
          const existing = procedureRows.find(p => p.id === procedureId);
      if (existing) {
        setFormData({
          nameAr: existing.nameAr,
          nameEn: existing.nameEn,
          descriptionAr: existing.descriptionAr,
          descriptionEn: existing.descriptionEn,
          policyId: existing.policyId,
          standardId: existing.standardId,
          status: existing.status,
          importance: existing.importance,
          startDate: existing.startDate,
          endDate: existing.endDate,
          assignedTo: existing.assignedTo,
          isPeriodic: existing.isPeriodic || false,
          frequency: existing.frequency || 'annual',
          attachments: existing.attachments || [],
          weight: typeof existing.weight === 'number' ? existing.weight : 1,
        });
          }
        } else if (parentId) {
          const parent = procedureRows.find(p => p.id === parentId);
      if (parent) {
        setFormData({
          nameAr: '',
          nameEn: '',
          descriptionAr: parent.descriptionAr || '',
          descriptionEn: parent.descriptionEn || '',
          policyId: parent.policyId,
          standardId: parent.standardId,
          status: 'not_started',
          importance: parent.importance,
          startDate: parent.startDate,
          endDate: parent.endDate,
          assignedTo: [...(parent.assignedTo || [])],
          isPeriodic: parent.isPeriodic || false,
          frequency: parent.frequency || 'annual',
          attachments: [],
          weight: 1,
        });
          }
        } else {
          setFormData(emptyForm);
        }
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || 'Could not load procedure data');
      }
    };

    loadData();
  }, [open, procedureId, parentId]);

  const handleSave = async () => {
    if (!formData.nameAr || !formData.nameEn || !formData.policyId || !formData.standardId) {
      toast.error(t('fill_required_fields'));
      return;
    }

    const existingForEdit = procedureId ? allProcedures.find(p => p.id === procedureId) : null;
    const clampedWeight = Math.max(1, Math.min(10, Math.round(Number(formData.weight) || 1)));
    const procedure: Procedure = {
      id: procedureId || Math.random().toString(36).substr(2, 9),
      parentId: existingForEdit?.parentId ?? parentId,
      ...formData,
      weight: clampedWeight,
      assignedTeams: [],
      createdAt: existingForEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Procedure;

    try {
      if (procedureId) {
        await proceduresApi.updateProcedure(procedureId, procedure);
      } else {
        await proceduresApi.createProcedure(procedure);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Could not save procedure');
      return;
    }

    const settings = mockService.getNotificationSettings();
    if (settings.notifyOnAssignment) {
      formData.assignedTo.forEach(userId => {
        mockService.addNotification({
          userId,
          titleAr: 'إسناد إجراء جديد',
          titleEn: 'New Procedure Assigned',
          messageAr: `تم إسناد إجراء جديد لك: ${formData.nameAr}`,
          messageEn: `A new procedure has been assigned to you: ${formData.nameEn}`,
          type: 'procedure_assignment',
          link: '/tasks',
        });
      });
    }

    toast.success(
      procedureId
        ? t('procedure_updated_success') || 'Procedure updated successfully'
        : t('procedure_added_success') || 'Procedure added successfully'
    );
    await onSaved();
    onClose();
  };

  const parentProc = parentId && !procedureId ? allProcedures.find(p => p.id === parentId) : null;

  const allProcs = open ? allProcedures : [];
  const hasChildren = !!procedureId && allProcs.some(p => p.parentId === procedureId);
  const computedParentWeight = hasChildren ? mockService.getProcedureEffectiveWeight(procedureId!, allProcs) : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto rounded-xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {procedureId
              ? (t('edit_procedure') || 'Edit Procedure')
              : parentId
                ? (isRtl ? 'إضافة إجراء فرعي' : 'Add Sub-Procedure')
                : t('add_procedure')}
          </DialogTitle>
          {parentProc && (
            <div className="mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[12px] font-bold text-emerald-700 w-fit">
              {isRtl ? 'تابع لـ:' : 'Parent:'} {isRtl ? parentProc.nameAr : parentProc.nameEn}
            </div>
          )}
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 py-4">
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-border-subtle p-5 space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Info className="w-5 h-5" />
                {t('basic_info') || 'Basic Information'}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-text-main">{t('name_ar')} <span className="text-red-500">*</span></label>
                  <Input
                    value={formData.nameAr || ''}
                    onChange={e => setFormData({ ...formData, nameAr: e.target.value })}
                    className="rounded-lg border-border-subtle h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-text-main">{t('name_en')} <span className="text-red-500">*</span></label>
                  <Input
                    value={formData.nameEn || ''}
                    onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                    className="rounded-lg border-border-subtle h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-text-main">{t('desc_ar')}</label>
                  <textarea
                    value={formData.descriptionAr || ''}
                    onChange={e => setFormData({ ...formData, descriptionAr: e.target.value })}
                    className="w-full min-h-[80px] rounded-lg border border-border-subtle p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-transparent"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-text-main">{t('desc_en')}</label>
                  <textarea
                    value={formData.descriptionEn || ''}
                    onChange={e => setFormData({ ...formData, descriptionEn: e.target.value })}
                    className="w-full min-h-[80px] rounded-lg border border-border-subtle p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-transparent"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border-subtle">
                <AttachmentsField
                  value={formData.attachments}
                  onChange={(next) => setFormData({ ...formData, attachments: next })}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-border-subtle p-5 space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Shield className="w-5 h-5" />
                {t('classification') || 'Classification'}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-text-main">{t('policy') || 'Policy'} <span className="text-red-500">*</span></label>
                  <Select
                    value={formData.policyId || ''}
                    onValueChange={val => setFormData({ ...formData, policyId: val, standardId: '' })}
                  >
                    <SelectTrigger className="rounded-lg border-border-subtle h-10">
                      <SelectValue placeholder={t('select_policy')}>
                        {formData.policyId
                          ? (policies.find(p => p.id === formData.policyId)?.[isRtl ? 'nameAr' : 'nameEn'])
                          : t('select_policy')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {policies.map(p => (
                        <SelectItem key={p.id} value={p.id}>{isRtl ? p.nameAr : p.nameEn}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-text-main">{t('standard') || 'Standard'} <span className="text-red-500">*</span></label>
                  <Select
                    value={formData.standardId || ''}
                    onValueChange={val => setFormData({ ...formData, standardId: val })}
                    disabled={!formData.policyId}
                  >
                    <SelectTrigger className="rounded-lg border-border-subtle h-10">
                      <SelectValue placeholder={t('select_standard')}>
                        {formData.standardId
                          ? (standards.find(s => s.id === formData.standardId)?.[isRtl ? 'nameAr' : 'nameEn'])
                          : t('select_standard')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {standards.filter(s => s.policyId === formData.policyId).map(s => (
                        <SelectItem key={s.id} value={s.id}>{isRtl ? s.nameAr : s.nameEn}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-border-subtle p-5 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold">
                <AlertCircle className="w-5 h-5" />
                {t('status_and_importance') || 'Status & Importance'}
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-text-main">{t('status')}</label>
                <Select value={formData.status || ''} onValueChange={val => setFormData({ ...formData, status: val })}>
                  <SelectTrigger className="rounded-lg border-border-subtle h-10">
                    <SelectValue>{formData.status ? t(formData.status) : t('status')}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">{t('not_started')}</SelectItem>
                    <SelectItem value="in_progress">{t('in_progress')}</SelectItem>
                    <SelectItem value="completed">{t('completed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-text-main">{t('importance')}</label>
                <Select value={formData.importance || ''} onValueChange={val => setFormData({ ...formData, importance: val })}>
                  <SelectTrigger className="rounded-lg border-border-subtle h-10">
                    <SelectValue>{formData.importance ? t(formData.importance) : t('importance')}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">{t('high')}</SelectItem>
                    <SelectItem value="medium">{t('medium')}</SelectItem>
                    <SelectItem value="low">{t('low')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-border-subtle p-5 space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold">
                <AlertCircle className="w-5 h-5" />
                {isRtl ? 'الوزن' : 'Weight'}
              </div>
              {hasChildren ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-border-subtle">
                    <span className="text-[12px] font-bold text-text-muted">
                      {isRtl ? 'وزن محسوب (مجموع الأبناء)' : 'Computed (sum of children)'}
                    </span>
                    <span className="text-lg font-black text-primary font-mono">{computedParentWeight}</span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    {isRtl
                      ? 'هذا الإجراء له إجراءات فرعية، وزنه محسوب تلقائياً من أوزان أبنائه.'
                      : 'This procedure has sub-procedures; its weight is the sum of its children\'s weights.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-text-main">
                    {isRtl ? 'الوزن (1–10)' : 'Weight (1–10)'}
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    step={1}
                    value={formData.weight}
                    onChange={e => setFormData({ ...formData, weight: Number(e.target.value) })}
                    className="rounded-lg border-border-subtle h-10"
                  />
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    {isRtl
                      ? 'يؤثر الوزن على نسبة إنجاز المعيار. الافتراضي 1.'
                      : 'Weight affects the standard\'s completion percentage. Default is 1.'}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-border-subtle p-5 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Calendar className="w-5 h-5" />
                {isRtl ? 'تاريخ الانتهاء' : 'End Date'}
              </div>
              <Input
                type="date"
                value={formData.endDate || ''}
                onChange={e => setFormData({ ...formData, endDate: e.target.value, startDate: e.target.value })}
                className="rounded-lg border-border-subtle h-10"
              />
            </div>

            <div className="bg-white rounded-xl border border-border-subtle p-5 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold">
                <User className="w-5 h-5" />
                {t('assignment') || 'Assignment'}
              </div>
              <div className="space-y-1 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                {users.map(user => (
                  <label key={user.uid} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-border-subtle">
                    <input
                      type="checkbox"
                      checked={formData.assignedTo.includes(user.uid)}
                      onChange={e => {
                        const next = e.target.checked
                          ? [...formData.assignedTo, user.uid]
                          : formData.assignedTo.filter(id => id !== user.uid);
                        setFormData({ ...formData, assignedTo: next });
                      }}
                      className="w-4 h-4 rounded border-border-subtle text-primary focus:ring-primary"
                    />
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600">
                      {user.displayName.charAt(0)}
                    </div>
                    <span className="text-[13px] font-medium text-text-main">{user.displayName}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
          <Button variant="outline" onClick={onClose} className="rounded-lg h-10 px-5 font-bold">
            <X className="w-4 h-4 mr-1" />
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white rounded-lg h-10 px-6 font-bold">
            <Save className="w-4 h-4 mr-1" />
            {t('save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
